import { CacheStorage } from './storage';
import { EmbeddingGenerator } from './embeddings';
import { calculateSimilarity } from './similarity';
import type {
    NanoCacheConfig,
    CacheEntry,
    CacheQueryResult,
    ChatCompletionRequest,
    ChatCompletionResponse
} from './types';

/**
 * NanoCache - Semantic cache for LLM API calls
 */
export class NanoCache {
    private storage: CacheStorage;
    private embeddings: EmbeddingGenerator;
    private config: Required<NanoCacheConfig>;

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
     * Query the cache for a similar prompt
     */
    async query(prompt: string): Promise<CacheQueryResult> {
        try {
            // Clean up expired entries if maxAge is set
            if (this.config.maxAge > 0) {
                await this.storage.removeExpired(this.config.maxAge);
            }

            // Generate embedding for the query
            const queryEmbedding = await this.embeddings.generate(prompt);

            // Get all cached entries
            const entries = await this.storage.getAll();

            if (entries.length === 0) {
                if (this.config.debug) {
                    console.log('[NanoCache] Cache is empty');
                }
                return { hit: false };
            }

            // Find the most similar entry
            let bestMatch: CacheEntry | null = null;
            let bestSimilarity = 0;

            for (const entry of entries) {
                const similarity = calculateSimilarity(queryEmbedding, entry.embedding);

                if (similarity > bestSimilarity) {
                    bestSimilarity = similarity;
                    bestMatch = entry;
                }
            }

            // Check if similarity exceeds threshold
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
     * Save a prompt-response pair to the cache
     */
    async save(prompt: string, response: string, metadata?: Record<string, any>): Promise<void> {
        try {
            // Generate embedding
            const embedding = await this.embeddings.generate(prompt);

            // Create cache entry
            const entry: CacheEntry = {
                prompt,
                embedding,
                response,
                timestamp: Date.now(),
                metadata
            };

            // Generate ID from prompt hash
            const id = this.hashPrompt(prompt);

            // Save to storage
            await this.storage.save(id, entry);

            if (this.config.debug) {
                console.log(`[NanoCache] Saved entry for prompt: "${prompt}"`);
            }
        } catch (error) {
            console.error('[NanoCache] Save error:', error);
            throw error;
        }
    }

    /**
     * Clear all cached entries
     */
    async clear(): Promise<void> {
        await this.storage.clear();

        if (this.config.debug) {
            console.log('[NanoCache] Cache cleared');
        }
    }

    /**
     * Get cache statistics
     */
    async getStats() {
        return await this.storage.getStats();
    }

    /**
     * Check if embedding model is loaded
     */
    isModelLoaded(): boolean {
        return this.embeddings.isLoaded();
    }

    /**
     * Preload the embedding model
     */
    async preloadModel(): Promise<void> {
        await this.embeddings.generate('warmup');

        if (this.config.debug) {
            console.log('[NanoCache] Model preloaded');
        }
    }

    /**
     * Unload the embedding model to free memory
     */
    async unloadModel(): Promise<void> {
        await this.embeddings.unload();
    }

    /**
     * Simple hash function for prompt
     */
    private hashPrompt(prompt: string): string {
        let hash = 0;
        for (let i = 0; i < prompt.length; i++) {
            const char = prompt.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Create a wrapper for OpenAI-compatible chat completion
     * This allows drop-in replacement of openai.chat.completions.create
     */
    createChatWrapper<T extends (req: ChatCompletionRequest) => Promise<ChatCompletionResponse>>(
        originalFn: T
    ): T {
        const self = this;

        return (async function wrappedCreate(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
            // Extract the user's prompt from messages
            const userMessage = request.messages
                .filter(m => m.role === 'user')
                .map(m => m.content)
                .join('\n');

            if (!userMessage) {
                // No user message, just call original
                return await originalFn(request);
            }

            // Check cache
            const cacheResult = await self.query(userMessage);

            if (cacheResult.hit && cacheResult.response) {
                // Return cached response in OpenAI format
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

            // Cache miss - call original function
            const response = await originalFn(request);

            // Save to cache
            const assistantMessage = response.choices[0]?.message?.content;
            if (assistantMessage) {
                await self.save(userMessage, assistantMessage, {
                    model: request.model,
                    timestamp: response.created
                });
            }

            return response;
        }) as T;
    }
}
