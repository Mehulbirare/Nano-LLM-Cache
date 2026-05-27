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
 * NanoCache - Semantic cache for LLM API calls
 */
export class NanoCache {
    private storage: CacheStorage;
    private embeddings: EmbeddingGenerator;
    private config: Required<NanoCacheConfig>;

    private index: Map<string, IndexedEntry> = new Map();
    private indexLoaded = false;
    private indexLoadPromise: Promise<void> | null = null;

    private lastExpiryRunAt = 0;

    private inflightQueries: Map<string, Promise<CacheQueryResult>> = new Map();
    private inflightLLMCalls: Map<string, Promise<ChatCompletionResponse>> = new Map();

    constructor(config: NanoCacheConfig = {}) {
        this.config = {
            similarityThreshold: config.similarityThreshold ?? 0.95,
            maxAge: config.maxAge ?? 0,
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

            let bestMatch: CacheEntry | null = null;
            let bestSimilarity = 0;

            for (const { entry, embF32 } of this.index.values()) {
                if (contextHash !== undefined && entry.contextHash !== contextHash) continue;

                const similarity = dotF32(queryF32, embF32);
                if (similarity > bestSimilarity) {
                    bestSimilarity = similarity;
                    bestMatch = entry;
                }
            }

            if (bestMatch && bestSimilarity >= this.config.similarityThreshold) {
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
            this.index.set(id, { entry, embF32: Float32Array.from(embedding) });

            if (this.config.debug) {
                console.log(`[NanoCache] Saved entry for prompt: "${prompt}"`);
            }
        } catch (error) {
            console.error('[NanoCache] Save error:', error);
            throw error;
        }
    }

    async clear(): Promise<void> {
        await this.storage.clear();
        this.index.clear();
        this.indexLoaded = true;

        if (this.config.debug) {
            console.log('[NanoCache] Cache cleared');
        }
    }

    async getStats() {
        return await this.storage.getStats();
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

    private async loadIndex(): Promise<void> {
        if (this.indexLoaded) return;
        if (this.indexLoadPromise) {
            await this.indexLoadPromise;
            return;
        }

        this.indexLoadPromise = (async () => {
            const all = await this.storage.getAllWithIds();
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
     */
    createChatWrapper<T extends (req: ChatCompletionRequest) => Promise<ChatCompletionResponse>>(
        originalFn: T
    ): T {
        const self = this;

        return (async function wrappedCreate(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
            const messages = request.messages;
            if (!messages || messages.length === 0) {
                return await originalFn(request);
            }

            let lastUserIdx = -1;
            for (let i = messages.length - 1; i >= 0; i--) {
                if (messages[i].role === 'user') {
                    lastUserIdx = i;
                    break;
                }
            }
            if (lastUserIdx === -1 || !messages[lastUserIdx].content) {
                return await originalFn(request);
            }

            const lastUserContent = messages[lastUserIdx].content;
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
                        const assistantMessage = response.choices?.[0]?.message?.content;
                        if (assistantMessage) {
                            await self.save(
                                lastUserContent,
                                assistantMessage,
                                { model: request.model, timestamp: response.created },
                                contextHash
                            );
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

function serializeContext(model: string, messages: ChatMessage[]): string {
    const parts = messages.map(m => `${m.role} ${m.content}`);
    return `model=${model}\n${parts.join('\n\n')}`;
}
