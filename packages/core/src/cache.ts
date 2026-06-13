import { CacheStorage } from './storage';
import { EmbeddingGenerator } from './embeddings';
import { dotF32, sha256Hex } from './similarity';
import type {
    NanoCacheConfig,
    CacheEntry,
    CacheQueryResult,
    ChatMessage,
    ChatCompletionRequest,
    ChatCompletionResponse
} from './types';

const EXPIRY_THROTTLE_MS = 60_000;

interface IndexedEntry {
    entry: CacheEntry;
    embF32: Float32Array;
}

/**
 * Options for the chat-completion wrapper.
 */
export interface ChatWrapperOptions {
    /**
     * Return false to skip the cache (both read and write) for a given request.
     * Useful for high-temperature / non-deterministic requests you don't want
     * to memoize.
     */
    shouldCache?: (request: ChatCompletionRequest) => boolean;
}

/**
 * NanoCache - Semantic cache for LLM API calls
 */
export class NanoCache {
    private storage: CacheStorage;
    private embeddings: EmbeddingGenerator;
    private config: Required<NanoCacheConfig>;

    private index: Map<string, IndexedEntry> = new Map();
    private indexLoaded = false;
    private indexLoadPromise: Promise<void> | null = null;
    // Bumped on clear() so an in-flight hydration discards stale results.
    private storeGeneration = 0;

    private lastExpiryRunAt = 0;

    private inflightQueries: Map<string, Promise<CacheQueryResult>> = new Map();
    private inflightLLMCalls: Map<string, Promise<ChatCompletionResponse>> = new Map();

    constructor(config: NanoCacheConfig = {}) {
        this.config = {
            similarityThreshold: config.similarityThreshold ?? 0.95,
            maxAge: config.maxAge ?? 0,
            maxEntries: config.maxEntries ?? 0,
            modelName: config.modelName ?? 'Xenova/all-MiniLM-L6-v2',
            debug: config.debug ?? false,
            storagePrefix: config.storagePrefix ?? 'nano-llm-cache'
        };

        this.storage = new CacheStorage(this.config.storagePrefix);
        this.embeddings = new EmbeddingGenerator(this.config.modelName, this.config.debug);
    }

    /**
     * Query the cache for a semantically similar prompt.
     * When contextHash is provided, only entries with the same contextHash are eligible —
     * this prevents wrong hits across conversations with different system prompts / prior turns.
     */
    async query(prompt: string, contextHash?: string): Promise<CacheQueryResult> {
        const dedupKey = `${contextHash ?? ''}::${prompt}`;
        const existing = this.inflightQueries.get(dedupKey);
        if (existing) return existing;

        const p = this._doQuery(prompt, contextHash);
        this.inflightQueries.set(dedupKey, p);
        try {
            return await p;
        } finally {
            this.inflightQueries.delete(dedupKey);
        }
    }

    private async _doQuery(prompt: string, contextHash?: string): Promise<CacheQueryResult> {
        try {
            await this.loadIndex();
            await this.maybeRunExpiry();

            const queryEmbedding = await this.embeddings.generate(prompt);
            const queryF32 = Float32Array.from(queryEmbedding);

            if (this.index.size === 0) {
                if (this.config.debug) console.log('[NanoCache] Cache is empty');
                return { hit: false };
            }

            const now = Date.now();
            let bestMatch: CacheEntry | null = null;
            let bestId: string | null = null;
            let bestSimilarity = 0;

            for (const [id, { entry, embF32 }] of this.index.entries()) {
                if (contextHash !== undefined && entry.contextHash !== contextHash) continue;
                // Enforce TTL on read so expired-but-not-yet-swept entries never hit.
                if (this.config.maxAge > 0 && now - entry.timestamp > this.config.maxAge) continue;
                // Skip entries whose embedding dimension differs (e.g. saved with a
                // different model under the same prefix) instead of throwing.
                if (embF32.length !== queryF32.length) continue;

                const similarity = dotF32(queryF32, embF32);
                if (similarity > bestSimilarity) {
                    bestSimilarity = similarity;
                    bestMatch = entry;
                    bestId = id;
                }
            }

            if (bestMatch && bestId && bestSimilarity >= this.config.similarityThreshold) {
                this.touch(bestId);
                if (this.config.debug) {
                    console.log(`[NanoCache] Cache HIT! Similarity: ${bestSimilarity.toFixed(4)}`);
                    console.log(`[NanoCache] Original: "${bestMatch.prompt}"`);
                    console.log(`[NanoCache] Query: "${prompt}"`);
                }
                return {
                    hit: true,
                    response: bestMatch.response,
                    similarity: bestSimilarity,
                    entry: bestMatch
                };
            }

            if (this.config.debug) {
                console.log(`[NanoCache] Cache MISS. Best similarity: ${bestSimilarity.toFixed(4)}`);
            }
            return { hit: false, similarity: bestSimilarity };
        } catch (error) {
            console.error('[NanoCache] Query error:', error);
            return { hit: false };
        }
    }

    /**
     * Save a prompt-response pair to the cache.
     */
    async save(
        prompt: string,
        response: string,
        metadata?: Record<string, any>,
        contextHash?: string
    ): Promise<void> {
        try {
            await this.loadIndex();

            const embedding = await this.embeddings.generate(prompt);

            const entry: CacheEntry = {
                prompt,
                embedding,
                response,
                timestamp: Date.now(),
                metadata,
                contextHash
            };

            const id = await sha256Hex(`${contextHash ?? ''}::${prompt}`);
            await this.storage.save(id, entry);

            // Re-insert so an overwritten entry moves to the most-recently-used end.
            this.index.delete(id);
            this.index.set(id, { entry, embF32: Float32Array.from(embedding) });

            await this.evictIfNeeded();

            if (this.config.debug) {
                console.log(`[NanoCache] Saved entry for prompt: "${prompt}"`);
            }
        } catch (error) {
            console.error('[NanoCache] Save error:', error);
            throw error;
        }
    }

    /**
     * Delete a single cached entry. Returns true if an entry was present.
     */
    async delete(prompt: string, contextHash?: string): Promise<boolean> {
        await this.loadIndex();
        const id = await sha256Hex(`${contextHash ?? ''}::${prompt}`);
        const existed = this.index.delete(id);
        await this.storage.delete(id);
        if (this.config.debug && existed) {
            console.log(`[NanoCache] Deleted entry for prompt: "${prompt}"`);
        }
        return existed;
    }

    async clear(): Promise<void> {
        this.storeGeneration++;
        await this.storage.clear();
        this.index.clear();
        this.indexLoaded = true;

        if (this.config.debug) {
            console.log('[NanoCache] Cache cleared');
        }
    }

    async getStats() {
        await this.loadIndex();
        if (this.index.size === 0) {
            return { totalEntries: 0, oldestEntry: null as number | null, newestEntry: null as number | null };
        }
        let oldest = Infinity;
        let newest = -Infinity;
        for (const { entry } of this.index.values()) {
            if (entry.timestamp < oldest) oldest = entry.timestamp;
            if (entry.timestamp > newest) newest = entry.timestamp;
        }
        return { totalEntries: this.index.size, oldestEntry: oldest, newestEntry: newest };
    }

    isModelLoaded(): boolean {
        return this.embeddings.isLoaded();
    }

    async preloadModel(): Promise<void> {
        await this.embeddings.generate('warmup');

        if (this.config.debug) {
            console.log('[NanoCache] Model preloaded');
        }
    }

    async unloadModel(): Promise<void> {
        await this.embeddings.unload();
    }

    /** Move an entry to the most-recently-used end of the LRU order. */
    private touch(id: string): void {
        if (this.config.maxEntries <= 0) return;
        const e = this.index.get(id);
        if (e) {
            this.index.delete(id);
            this.index.set(id, e);
        }
    }

    /** Evict least-recently-used entries until within maxEntries. */
    private async evictIfNeeded(): Promise<void> {
        if (this.config.maxEntries <= 0) return;
        while (this.index.size > this.config.maxEntries) {
            const oldestId = this.index.keys().next().value as string | undefined;
            if (!oldestId) break;
            this.index.delete(oldestId);
            await this.storage.delete(oldestId);
            if (this.config.debug) {
                console.log(`[NanoCache] Evicted LRU entry ${oldestId}`);
            }
        }
    }

    private async loadIndex(): Promise<void> {
        if (this.indexLoaded) return;
        if (this.indexLoadPromise) {
            await this.indexLoadPromise;
            return;
        }

        this.indexLoadPromise = (async () => {
            const gen = this.storeGeneration;
            const all = await this.storage.getAllWithIds();
            // A clear() that happened while we were fetching wins — drop stale rows.
            if (gen !== this.storeGeneration) return;
            for (const { id, entry } of all) {
                this.index.set(id, { entry, embF32: Float32Array.from(entry.embedding) });
            }
            this.indexLoaded = true;
            if (this.config.debug) {
                console.log(`[NanoCache] Index hydrated with ${this.index.size} entries`);
            }
        })();

        try {
            await this.indexLoadPromise;
        } finally {
            this.indexLoadPromise = null;
        }
    }

    private async maybeRunExpiry(): Promise<void> {
        if (this.config.maxAge <= 0) return;
        const now = Date.now();
        if (now - this.lastExpiryRunAt < EXPIRY_THROTTLE_MS) return;
        this.lastExpiryRunAt = now;

        const toDelete: string[] = [];
        for (const [id, { entry }] of this.index.entries()) {
            if (now - entry.timestamp > this.config.maxAge) {
                toDelete.push(id);
            }
        }
        for (const id of toDelete) {
            await this.storage.delete(id);
            this.index.delete(id);
        }
        if (this.config.debug && toDelete.length > 0) {
            console.log(`[NanoCache] Expired ${toDelete.length} entries`);
        }
    }

    /**
     * Create a wrapper for OpenAI-compatible chat completion.
     * Hashes the full conversation context (model + system + prior turns) so two
     * requests with the same final user message but different context don't collide.
     * In-flight LLM calls for the same key are deduplicated.
     *
     * Streaming requests, requests asking for multiple completions (n > 1), and
     * messages without extractable text are passed through uncached.
     */
    createChatWrapper<T extends (req: ChatCompletionRequest) => Promise<ChatCompletionResponse>>(
        originalFn: T,
        options: ChatWrapperOptions = {}
    ): T {
        const self = this;

        return (async function wrappedCreate(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
            const messages = request.messages;
            if (!messages || messages.length === 0) {
                return await originalFn(request);
            }

            // Bypass caching for cases the cache can't faithfully represent.
            const stream = (request as Record<string, any>).stream === true;
            const n = (request as Record<string, any>).n;
            const wantsMultiple = typeof n === 'number' && n > 1;
            const optedOut = options.shouldCache ? !options.shouldCache(request) : false;
            if (stream || wantsMultiple || optedOut) {
                return await originalFn(request);
            }

            let lastUserIdx = -1;
            for (let i = messages.length - 1; i >= 0; i--) {
                if (messages[i].role === 'user') {
                    lastUserIdx = i;
                    break;
                }
            }
            if (lastUserIdx === -1) {
                return await originalFn(request);
            }

            const lastUserContent = extractText(messages[lastUserIdx].content);
            if (lastUserContent === null) {
                return await originalFn(request);
            }

            const contextMessages = messages.slice(0, lastUserIdx);
            const contextHash = await sha256Hex(serializeContext(request.model, contextMessages));

            const cacheResult = await self.query(lastUserContent, contextHash);

            if (cacheResult.hit && cacheResult.response) {
                return {
                    id: `nano-cache-${Date.now()}`,
                    object: 'chat.completion',
                    created: Math.floor(Date.now() / 1000),
                    model: request.model,
                    choices: [
                        {
                            index: 0,
                            message: {
                                role: 'assistant',
                                content: cacheResult.response
                            },
                            finish_reason: 'stop'
                        }
                    ]
                };
            }

            const inflightKey = `${contextHash}::${lastUserContent}`;
            let pending = self.inflightLLMCalls.get(inflightKey);
            if (!pending) {
                pending = (async () => {
                    try {
                        const response = await originalFn(request);
                        const assistantMessage = extractText(response.choices?.[0]?.message?.content);
                        if (assistantMessage) {
                            // Caching is a best-effort side effect — never let a
                            // storage failure surface as a failed completion.
                            try {
                                await self.save(
                                    lastUserContent,
                                    assistantMessage,
                                    { model: request.model, apiCreated: response.created },
                                    contextHash
                                );
                            } catch (err) {
                                if (self.config.debug) {
                                    console.error('[NanoCache] Failed to cache response:', err);
                                }
                            }
                        }
                        return response;
                    } finally {
                        self.inflightLLMCalls.delete(inflightKey);
                    }
                })();
                self.inflightLLMCalls.set(inflightKey, pending);
            }
            return await pending;
        }) as T;
    }
}

/**
 * Extract plain text from a message content value (string, multimodal parts,
 * or null). Returns null when there is no usable text.
 */
function extractText(content: ChatMessage['content'] | undefined): string | null {
    if (typeof content === 'string') {
        return content.length > 0 ? content : null;
    }
    if (Array.isArray(content)) {
        const text = content
            .filter(p => p && p.type === 'text' && typeof p.text === 'string')
            .map(p => p.text as string)
            .join('\n')
            .trim();
        return text.length > 0 ? text : null;
    }
    return null;
}

/**
 * Unambiguous serialization of the conversation context. Using a JSON array of
 * [role, content] pairs avoids collisions that a flat string join could produce
 * when message content itself contains delimiters or role-like text.
 */
function serializeContext(model: string, messages: ChatMessage[]): string {
    return JSON.stringify([model, messages.map(m => [m.role, m.content])]);
}
