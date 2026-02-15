# 🚀 Nano-LLM-Cache

[![npm version](https://badge.fury.io/js/nano-llm-cache.svg)](https://www.npmjs.com/package/nano-llm-cache)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **A Semantic Cache for LLM API Calls** - Save money and improve response times by caching based on *meaning*, not exact matches.

## 🎯 What is Nano-LLM-Cache?

Nano-LLM-Cache is a TypeScript library that intercepts LLM API calls and returns cached responses based on **semantic similarity** rather than exact string matching. It uses local embeddings (running entirely in the browser/client-side) to understand the *meaning* of prompts.

### The Problem

Traditional caches look for exact key matches:
- ❌ "What is the weather in London?" → Cache MISS
- ❌ "Tell me the London weather" → Cache MISS (different string!)

### The Solution

Nano-LLM-Cache uses **vector embeddings** to understand meaning:
- ✅ "What is the weather in London?" → Cache HIT
- ✅ "Tell me the London weather" → Cache HIT (same meaning!)

## ✨ Features

- 🧠 **Semantic Understanding**: Matches prompts by meaning, not exact text
- 🔒 **Privacy-First**: Embeddings run locally - your data never leaves the device
- ⚡ **Fast & Lightweight**: Uses quantized models (~20MB, cached forever)
- 💾 **Persistent Storage**: IndexedDB for cross-session caching
- ⏰ **TTL Support**: Configurable time-to-live for cache entries
- 🔌 **Drop-in Replacement**: Works as an OpenAI SDK wrapper
- 📊 **Cache Analytics**: Built-in statistics and monitoring
- 🎨 **TypeScript**: Full type safety and IntelliSense support

## 📦 Installation

```bash
npm install @nano-llm-cache/core
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { NanoCache } from '@nano-llm-cache/core';

// Create cache instance
const cache = new NanoCache({
  similarityThreshold: 0.95, // 95% similarity required for cache hit
  maxAge: 60 * 60 * 1000,    // 1 hour TTL
  debug: true                 // Enable logging
});

// Save a response
await cache.save(
  'What is the weather in London?',
  'The weather in London is cloudy with a chance of rain, 15°C.'
);

// Query with similar prompt
const result = await cache.query('Tell me the London weather');

if (result.hit) {
  console.log('Cache HIT!', result.response);
  console.log('Similarity:', result.similarity); // 0.98
} else {
  console.log('Cache MISS - call your LLM API');
}
```

### OpenAI Wrapper (Drop-in Replacement)

```typescript
import OpenAI from 'openai';
import { NanoCache } from '@nano-llm-cache/core';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const cache = new NanoCache({ similarityThreshold: 0.95 });

// Wrap the OpenAI function
const cachedCreate = cache.createChatWrapper(
  openai.chat.completions.create.bind(openai.chat.completions)
);

// Use it exactly like the original!
const response = await cachedCreate({
  model: 'gpt-4',
  messages: [
    { role: 'user', content: 'How do I center a div?' }
  ]
});

console.log(response.choices[0].message.content);

// Second call with similar question - returns cached response instantly!
const response2 = await cachedCreate({
  model: 'gpt-4',
  messages: [
    { role: 'user', content: 'Best way to align a div to the middle?' }
  ]
});
```

## 📚 API Reference

### `NanoCache`

#### Constructor

```typescript
new NanoCache(config?: NanoCacheConfig)
```

**Configuration Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `similarityThreshold` | `number` | `0.95` | Minimum similarity (0-1) for cache hit |
| `maxAge` | `number` | `undefined` | Max age in ms before entries expire |
| `modelName` | `string` | `'Xenova/all-MiniLM-L6-v2'` | Embedding model to use |
| `debug` | `boolean` | `false` | Enable debug logging |
| `storagePrefix` | `string` | `'nano-llm-cache'` | IndexedDB key prefix |

#### Methods

##### `query(prompt: string): Promise<CacheQueryResult>`

Search the cache for a semantically similar prompt.

```typescript
const result = await cache.query('What is TypeScript?');

if (result.hit) {
  console.log(result.response);    // Cached response
  console.log(result.similarity);  // 0.97
  console.log(result.entry);       // Full cache entry
}
```

##### `save(prompt: string, response: string, metadata?: object): Promise<void>`

Save a prompt-response pair to the cache.

```typescript
await cache.save(
  'What is TypeScript?',
  'TypeScript is a typed superset of JavaScript.',
  { model: 'gpt-4', timestamp: Date.now() }
);
```

##### `clear(): Promise<void>`

Clear all cache entries.

```typescript
await cache.clear();
```

##### `getStats(): Promise<CacheStats>`

Get cache statistics.

```typescript
const stats = await cache.getStats();
console.log(stats.totalEntries);  // 42
console.log(stats.oldestEntry);   // 1707123456789
console.log(stats.newestEntry);   // 1707987654321
```

##### `preloadModel(): Promise<void>`

Preload the embedding model (recommended for better UX).

```typescript
await cache.preloadModel();
```

##### `unloadModel(): Promise<void>`

Unload the model to free memory.

```typescript
await cache.unloadModel();
```

##### `createChatWrapper<T>(originalFn: T): T`

Create an OpenAI-compatible wrapper function.

```typescript
const cachedCreate = cache.createChatWrapper(
  openai.chat.completions.create.bind(openai.chat.completions)
);
```

## 🎨 Examples

### Example 1: Weather Queries

```typescript
const cache = new NanoCache({ similarityThreshold: 0.95 });

// Save weather data
await cache.save(
  'What is the weather in London?',
  'Cloudy, 15°C, chance of rain'
);

// These all return the cached response:
await cache.query('Tell me the London weather');        // ✅ HIT
await cache.query('How is the weather in London?');     // ✅ HIT
await cache.query('London weather today');              // ✅ HIT
await cache.query('What is the weather in Paris?');     // ❌ MISS
```

### Example 2: Programming Questions

```typescript
await cache.save(
  'How do I center a div?',
  'Use flexbox: display: flex; justify-content: center; align-items: center;'
);

// Similar questions hit the cache:
await cache.query('Best way to align a div to the middle?');  // ✅ HIT
await cache.query('Center a div CSS');                        // ✅ HIT
await cache.query('How to make a div centered?');             // ✅ HIT
```

### Example 3: With TTL (Time To Live)

```typescript
const cache = new NanoCache({
  maxAge: 60 * 60 * 1000  // 1 hour
});

// Weather data expires after 1 hour
await cache.save(
  'Current temperature in NYC',
  '72°F, sunny'
);

// After 1 hour, this will be a cache miss
```

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Run tests with UI:

```bash
npm run test:ui
```

Generate coverage report:

```bash
npm run test:coverage
```

## 🏗️ Building

Build the library:

```bash
npm run build
```

Development mode (watch):

```bash
npm run dev
```

## 📊 How It Works

### 1. Vector Embeddings

When you save a prompt, Nano-LLM-Cache converts it into a **384-dimensional vector**:

```
"What is the weather in London?" → [0.12, -0.44, 0.88, ...]
"Tell me the London weather"    → [0.13, -0.43, 0.89, ...]
```

These vectors are **close together in space** because they have similar meanings.

### 2. Cosine Similarity

When querying, we calculate the **cosine similarity** between vectors:

```typescript
similarity = dotProduct(vecA, vecB) / (magnitude(vecA) * magnitude(vecB))
```

A similarity of `0.95` means the prompts are 95% semantically similar.

### 3. Local Processing

Everything runs **locally** using WebAssembly:
- ✅ No API calls for embeddings
- ✅ No data sent to external servers
- ✅ Works offline after initial model download
- ✅ Model cached in browser (~20MB, downloads once)

## 💡 Use Cases

### 1. **Cost Reduction**

LLM APIs charge per token. For a million users asking similar questions:
- Without cache: $50,000+ in API costs
- With Nano-LLM-Cache: $500 (99% cache hit rate)

### 2. **Faster Response Times**

- API call: 2-5 seconds
- Cache hit: <100ms

### 3. **Offline Capability**

Once the model is cached, your app works offline for cached queries.

### 4. **Privacy**

User prompts are embedded locally - no data leaves the device until the actual LLM call.

## ⚙️ Configuration Tips

### Similarity Threshold

- `0.99`: Very strict - only nearly identical prompts match
- `0.95`: Recommended - catches paraphrases and similar questions
- `0.90`: Looser - may match somewhat related topics
- `0.85`: Very loose - use with caution

### Model Selection

Default: `Xenova/all-MiniLM-L6-v2` (384 dimensions, ~20MB)

Other options:
- `Xenova/all-MiniLM-L12-v2`: Larger, more accurate (~45MB)
- `Xenova/paraphrase-multilingual-MiniLM-L12-v2`: Multilingual support

### TTL Strategy

```typescript
// Real-time data (weather, stock prices)
maxAge: 60 * 60 * 1000  // 1 hour

// Static knowledge (programming questions)
maxAge: undefined  // Never expire

// Daily updates (news summaries)
maxAge: 24 * 60 * 60 * 1000  // 24 hours
```

## 🔧 Advanced Usage

### Custom Storage

```typescript
import { NanoCache } from '@nano-llm-cache/core';

const cache = new NanoCache({
  storagePrefix: 'my-app-cache'  // Separate cache per app
});
```

### Batch Operations

```typescript
// Save multiple entries
const entries = [
  { prompt: 'Q1', response: 'A1' },
  { prompt: 'Q2', response: 'A2' },
];

for (const { prompt, response } of entries) {
  await cache.save(prompt, response);
}
```

### Cache Warming

```typescript
// Preload common queries on app startup
async function warmCache() {
  await cache.preloadModel();
  
  const commonQueries = [
    { q: 'How do I...', a: '...' },
    { q: 'What is...', a: '...' },
  ];
  
  for (const { q, a } of commonQueries) {
    await cache.save(q, a);
  }
}
```

## 📈 Performance

| Operation | Time |
|-----------|------|
| First query (model load) | ~2-3s |
| Subsequent queries | ~50-100ms |
| Save operation | ~50-100ms |
| Cache hit | <10ms |

**Memory Usage:**
- Model: ~20MB (cached in browser)
- Per entry: ~2-3KB (embedding + metadata)
- 1000 entries: ~2-3MB

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT © [Your Name]

## 🙏 Acknowledgments

- [@xenova/transformers](https://github.com/xenova/transformers.js) - WASM-based transformers
- [idb-keyval](https://github.com/jakearchibald/idb-keyval) - Simple IndexedDB wrapper
- [all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) - Embedding model

## 🔗 Links

- [GitHub Repository](https://github.com/yourusername/nano-llm-cache)
- [NPM Package](https://www.npmjs.com/package/nano-llm-cache)
- [Documentation](https://github.com/yourusername/nano-llm-cache#readme)
- [Issues](https://github.com/yourusername/nano-llm-cache/issues)

---

**Made with ❤️ by developers who hate paying for duplicate LLM calls**
