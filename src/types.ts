/**
 * Configuration options for NanoCache
 */
export interface NanoCacheConfig {
    /**
     * Similarity threshold for cache hits (0-1)
     * @default 0.95
     */
    similarityThreshold?: number;

    /**
     * Maximum age of cached entries in milliseconds
     * @default undefined (no expiration)
     */
    maxAge?: number;

    /**
     * Model name for embeddings
     * @default 'Xenova/all-MiniLM-L6-v2'
     */
    modelName?: string;

    /**
     * Enable debug logging
     * @default false
     */
    debug?: boolean;

    /**
     * Custom storage key prefix
     * @default 'nano-llm-cache'
     */
    storagePrefix?: string;
}

/**
 * Cached entry structure
 */
export interface CacheEntry {
    prompt: string;
    embedding: number[];
    response: string;
    timestamp: number;
    metadata?: Record<string, any>;
}

/**
 * Cache query result
 */
export interface CacheQueryResult {
    hit: boolean;
    response?: string;
    similarity?: number;
    entry?: CacheEntry;
}

/**
 * OpenAI-compatible message structure
 */
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/**
 * OpenAI-compatible chat completion request
 */
export interface ChatCompletionRequest {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    max_tokens?: number;
    [key: string]: any;
}

/**
 * OpenAI-compatible chat completion response
 */
export interface ChatCompletionResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: ChatMessage;
        finish_reason: string;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}
