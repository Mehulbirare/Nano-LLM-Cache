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
     * Maximum age of cached entries in milliseconds.
     * Use 0 (the default) to disable expiration.
     * @default 0
     */
    maxAge?: number;

    /**
     * Maximum number of entries to keep. When exceeded, the least-recently-used
     * entries are evicted. Use 0 (the default) for an unbounded cache.
     * @default 0
     */
    maxEntries?: number;

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
    /**
     * SHA-256 hash of the conversation context (model + system prompt + prior turns).
     * Present when the entry was saved via the chat wrapper. When set, it acts as an
     * exact-match gate so that semantically similar user messages with different
     * system prompts / prior turns do not collide.
     */
    contextHash?: string;
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
 * OpenAI-compatible role.
 */
export type ChatRole = 'system' | 'user' | 'assistant' | 'tool' | 'function';

/**
 * A single content part for multimodal messages (text, image, etc.).
 */
export interface ChatContentPart {
    type: string;
    text?: string;
    [key: string]: any;
}

/**
 * OpenAI-compatible message structure.
 * `content` may be a plain string, an array of content parts (multimodal),
 * or null (e.g. assistant messages that only contain tool calls).
 */
export interface ChatMessage {
    role: ChatRole;
    content: string | ChatContentPart[] | null;
    name?: string;
    [key: string]: any;
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
