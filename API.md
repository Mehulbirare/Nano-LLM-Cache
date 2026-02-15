# 📚 Nano-LLM-Cache API Reference

Complete API documentation for Nano-LLM-Cache v1.0.0

---

## Table of Contents

1. [Installation](#installation)
2. [NanoCache Class](#nanocache-class)
3. [Configuration](#configuration)
4. [Methods](#methods)
5. [Types](#types)
6. [Utility Functions](#utility-functions)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)

---

## Installation

```bash
npm install nano-llm-cache
```

### Import

```typescript
// ES Modules
import { NanoCache, calculateSimilarity } from 'nano-llm-cache';

// CommonJS
const { NanoCache, calculateSimilarity } = require('nano-llm-cache');
```

---

## NanoCache Class

### Constructor

```typescript
new NanoCache(config?: NanoCacheConfig)
```

Creates a new NanoCache instance.

**Parameters:**
- `config` (optional): Configuration object

**Example:**
```typescript
const cache = new NanoCache({
  similarityThreshold: 0.95,
  maxAge: 60 * 60 * 1000,
  debug: true
});
```

---

## Configuration

### NanoCacheConfig Interface

```typescript
interface NanoCacheConfig {
  similarityThreshold?: number;
  maxAge?: number;
  modelName?: string;
  debug?: boolean;
  storagePrefix?: string;
}
```

#### Properties

##### `similarityThreshold`
- **Type:** `number`
- **Default:** `0.95`
- **Range:** `0.0` to `1.0`
- **Description:** Minimum similarity score required for a cache hit

**Examples:**
```typescript
// Very strict - only nearly identical prompts
{ similarityThreshold: 0.99 }

// Recommended - catches paraphrases
{ similarityThreshold: 0.95 }

// Looser - may match somewhat related topics
{ similarityThreshold: 0.90 }

// Very loose - use with caution
{ similarityThreshold: 0.85 }
```

##### `maxAge`
- **Type:** `number`
- **Default:** `undefined` (no expiration)
- **Unit:** Milliseconds
- **Description:** Maximum age of cache entries before expiration

**Examples:**
```typescript
// 1 hour
{ maxAge: 60 * 60 * 1000 }

// 24 hours
{ maxAge: 24 * 60 * 60 * 1000 }

// 1 week
{ maxAge: 7 * 24 * 60 * 60 * 1000 }

// No expiration
{ maxAge: undefined }
```

##### `modelName`
- **Type:** `string`
- **Default:** `'Xenova/all-MiniLM-L6-v2'`
- **Description:** Embedding model to use

**Available Models:**
```typescript
// Default - balanced size and accuracy
{ modelName: 'Xenova/all-MiniLM-L6-v2' }  // 384 dims, ~20MB

// Larger - more accurate
{ modelName: 'Xenova/all-MiniLM-L12-v2' }  // 384 dims, ~45MB

// Multilingual
{ modelName: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2' }
```

##### `debug`
- **Type:** `boolean`
- **Default:** `false`
- **Description:** Enable debug logging to console

**Example:**
```typescript
{ debug: true }
// Logs: [NanoCache] Loading model...
// Logs: [NanoCache] Cache HIT! Similarity: 0.9823
```

##### `storagePrefix`
- **Type:** `string`
- **Default:** `'nano-llm-cache'`
- **Description:** Prefix for IndexedDB keys

**Example:**
```typescript
// Separate cache per app
{ storagePrefix: 'my-app-cache' }
```

---

## Methods

### query()

Search the cache for a semantically similar prompt.

```typescript
async query(prompt: string): Promise<CacheQueryResult>
```

**Parameters:**
- `prompt`: The text prompt to search for

**Returns:** `Promise<CacheQueryResult>`

**Example:**
```typescript
const result = await cache.query('What is TypeScript?');

if (result.hit) {
  console.log('Response:', result.response);
  console.log('Similarity:', result.similarity);
  console.log('Entry:', result.entry);
} else {
  console.log('Cache miss');
  console.log('Best similarity:', result.similarity);
}
```

**CacheQueryResult:**
```typescript
interface CacheQueryResult {
  hit: boolean;           // Whether a cache hit occurred
  response?: string;      // Cached response (if hit)
  similarity?: number;    // Similarity score (0-1)
  entry?: CacheEntry;     // Full cache entry (if hit)
}
```

---

### save()

Save a prompt-response pair to the cache.

```typescript
async save(
  prompt: string,
  response: string,
  metadata?: Record<string, any>
): Promise<void>
```

**Parameters:**
- `prompt`: The prompt text
- `response`: The response text
- `metadata` (optional): Additional metadata to store

**Example:**
```typescript
await cache.save(
  'What is TypeScript?',
  'TypeScript is a typed superset of JavaScript.',
  {
    model: 'gpt-4',
    timestamp: Date.now(),
    tokens: 150
  }
);
```

---

### clear()

Clear all cache entries.

```typescript
async clear(): Promise<void>
```

**Example:**
```typescript
await cache.clear();
console.log('Cache cleared');
```

---

### getStats()

Get cache statistics.

```typescript
async getStats(): Promise<CacheStats>
```

**Returns:**
```typescript
interface CacheStats {
  totalEntries: number;      // Total number of cached entries
  oldestEntry: number | null; // Timestamp of oldest entry
  newestEntry: number | null; // Timestamp of newest entry
}
```

**Example:**
```typescript
const stats = await cache.getStats();
console.log(`Total entries: ${stats.totalEntries}`);
console.log(`Oldest: ${new Date(stats.oldestEntry)}`);
console.log(`Newest: ${new Date(stats.newestEntry)}`);
```

---

### preloadModel()

Preload the embedding model (recommended for better UX).

```typescript
async preloadModel(): Promise<void>
```

**Example:**
```typescript
// On app startup
await cache.preloadModel();
console.log('Model ready!');
```

---

### unloadModel()

Unload the embedding model to free memory.

```typescript
async unloadModel(): Promise<void>
```

**Example:**
```typescript
// When cache is no longer needed
await cache.unloadModel();
```

---

### isModelLoaded()

Check if the embedding model is loaded.

```typescript
isModelLoaded(): boolean
```

**Example:**
```typescript
if (!cache.isModelLoaded()) {
  console.log('Model not loaded yet');
  await cache.preloadModel();
}
```

---

### createChatWrapper()

Create an OpenAI-compatible wrapper function.

```typescript
createChatWrapper<T>(originalFn: T): T
```

**Parameters:**
- `originalFn`: The original OpenAI chat completion function

**Returns:** Wrapped function with caching

**Example:**
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: 'sk-...' });
const cache = new NanoCache();

// Wrap the function
const cachedCreate = cache.createChatWrapper(
  openai.chat.completions.create.bind(openai.chat.completions)
);

// Use it like normal OpenAI
const response = await cachedCreate({
  model: 'gpt-4',
  messages: [
    { role: 'user', content: 'How do I center a div?' }
  ]
});

console.log(response.choices[0].message.content);
```

---

## Types

### CacheEntry

```typescript
interface CacheEntry {
  prompt: string;              // Original prompt
  embedding: number[];         // Vector embedding (384 dims)
  response: string;            // Cached response
  timestamp: number;           // Creation timestamp
  metadata?: Record<string, any>; // Optional metadata
}
```

### ChatMessage

```typescript
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
```

### ChatCompletionRequest

```typescript
interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  [key: string]: any;
}
```

### ChatCompletionResponse

```typescript
interface ChatCompletionResponse {
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
```

---

## Utility Functions

### calculateSimilarity()

Calculate cosine similarity between two vectors.

```typescript
function calculateSimilarity(vecA: number[], vecB: number[]): number
```

**Parameters:**
- `vecA`: First vector
- `vecB`: Second vector

**Returns:** Similarity score (0-1)

**Example:**
```typescript
import { calculateSimilarity } from 'nano-llm-cache';

const vec1 = [1, 2, 3, 4];
const vec2 = [1, 2, 3, 4];

const similarity = calculateSimilarity(vec1, vec2);
console.log(similarity); // 1.0 (identical)
```

**Throws:**
- Error if vectors have different lengths

---

### normalizeVector()

Normalize a vector to unit length.

```typescript
function normalizeVector(vec: number[]): number[]
```

**Parameters:**
- `vec`: Input vector

**Returns:** Normalized vector

**Example:**
```typescript
import { normalizeVector } from 'nano-llm-cache';

const vec = [3, 4];
const normalized = normalizeVector(vec);
console.log(normalized); // [0.6, 0.8]
```

---

## Error Handling

### Common Errors

#### Model Loading Failed
```typescript
try {
  await cache.preloadModel();
} catch (error) {
  console.error('Failed to load model:', error);
  // Possible causes:
  // - Network error (first load)
  // - Browser doesn't support WASM
  // - Insufficient memory
}
```

#### Vector Length Mismatch
```typescript
try {
  calculateSimilarity([1, 2], [1, 2, 3]);
} catch (error) {
  console.error(error); // "Vectors must have the same length"
}
```

#### Storage Errors
```typescript
try {
  await cache.save(prompt, response);
} catch (error) {
  console.error('Storage error:', error);
  // Possible causes:
  // - IndexedDB quota exceeded
  // - Browser doesn't support IndexedDB
}
```

---

## Best Practices

### 1. Preload the Model

```typescript
// ✅ Good - preload on app startup
async function initApp() {
  const cache = new NanoCache();
  await cache.preloadModel();
  // Now queries are instant
}

// ❌ Bad - model loads on first query
const cache = new NanoCache();
await cache.query(prompt); // Slow first time
```

### 2. Use Appropriate Thresholds

```typescript
// ✅ Good - strict for factual data
const factCache = new NanoCache({
  similarityThreshold: 0.98
});

// ✅ Good - looser for general queries
const generalCache = new NanoCache({
  similarityThreshold: 0.92
});

// ❌ Bad - too loose, may match unrelated
const badCache = new NanoCache({
  similarityThreshold: 0.70
});
```

### 3. Set TTL for Time-Sensitive Data

```typescript
// ✅ Good - weather data expires
const weatherCache = new NanoCache({
  maxAge: 60 * 60 * 1000 // 1 hour
});

// ✅ Good - programming knowledge doesn't expire
const knowledgeCache = new NanoCache({
  maxAge: undefined
});
```

### 4. Handle Cache Misses Gracefully

```typescript
// ✅ Good - fallback to API
async function getResponse(prompt) {
  const result = await cache.query(prompt);
  
  if (result.hit) {
    return result.response;
  }
  
  // Cache miss - call API
  const response = await callLLMAPI(prompt);
  await cache.save(prompt, response);
  return response;
}
```

### 5. Monitor Cache Performance

```typescript
// ✅ Good - track hit rate
let hits = 0;
let misses = 0;

async function query(prompt) {
  const result = await cache.query(prompt);
  
  if (result.hit) {
    hits++;
  } else {
    misses++;
  }
  
  const hitRate = hits / (hits + misses);
  console.log(`Hit rate: ${(hitRate * 100).toFixed(2)}%`);
  
  return result;
}
```

### 6. Clean Up When Done

```typescript
// ✅ Good - unload model when not needed
window.addEventListener('beforeunload', async () => {
  await cache.unloadModel();
});
```

---

## Complete Example

```typescript
import { NanoCache } from 'nano-llm-cache';
import OpenAI from 'openai';

// Initialize
const cache = new NanoCache({
  similarityThreshold: 0.95,
  maxAge: 60 * 60 * 1000, // 1 hour
  debug: true
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Preload model
await cache.preloadModel();

// Create wrapper
const cachedCreate = cache.createChatWrapper(
  openai.chat.completions.create.bind(openai.chat.completions)
);

// Use it
const response = await cachedCreate({
  model: 'gpt-4',
  messages: [
    { role: 'user', content: 'What is TypeScript?' }
  ]
});

console.log(response.choices[0].message.content);

// Get stats
const stats = await cache.getStats();
console.log('Cache stats:', stats);

// Clean up
await cache.unloadModel();
```

---

## Version History

See [CHANGELOG.md](CHANGELOG.md) for version history.

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Questions or issues?** Open an issue on GitHub!
