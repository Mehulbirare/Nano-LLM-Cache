# 🚀 Nano-LLM-Cache - Quick Start Guide

## Installation

```bash
cd c:\Users\mehul\Projects\nano-llm-cache
npm install
```

## Build the Library

```bash
npm run build
```

This will create the distribution files in the `dist/` folder:
- `dist/index.js` - CommonJS build
- `dist/index.mjs` - ES Module build
- `dist/index.d.ts` - TypeScript definitions

## Run the Demo

```bash
node demo-node.mjs
```

This will demonstrate:
1. Vector similarity calculations
2. Saving prompts to cache
3. Querying with exact matches
4. Querying with semantically similar prompts
5. Cache statistics

## Project Structure

```
nano-llm-cache/
├── src/
│   ├── index.ts           # Main entry point
│   ├── types.ts           # TypeScript type definitions
│   ├── cache.ts           # Core NanoCache class
│   ├── embeddings.ts      # Embedding generator using @xenova/transformers
│   ├── storage.ts         # IndexedDB storage layer
│   ├── similarity.ts      # Vector similarity calculations
│   └── __tests__/         # Test files
│       ├── cache.test.ts
│       └── similarity.test.ts
├── examples/
│   ├── basic-usage.ts     # Comprehensive examples
│   └── browser-demo.html  # Interactive browser demo
├── dist/                  # Built files (generated)
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── README.md              # Full documentation
├── CHANGELOG.md
├── CONTRIBUTING.md
└── LICENSE

```

## Usage Examples

### Basic Usage

```typescript
import { NanoCache } from 'nano-llm-cache';

const cache = new NanoCache({
  similarityThreshold: 0.95,
  maxAge: 60 * 60 * 1000, // 1 hour
  debug: true
});

// Save a response
await cache.save(
  'What is the weather in London?',
  'Cloudy, 15°C'
);

// Query with similar prompt
const result = await cache.query('Tell me the London weather');

if (result.hit) {
  console.log('Cache hit!', result.response);
}
```

### OpenAI Wrapper

```typescript
import OpenAI from 'openai';
import { NanoCache } from 'nano-llm-cache';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const cache = new NanoCache({ similarityThreshold: 0.95 });

// Wrap the OpenAI function
const cachedCreate = cache.createChatWrapper(
  openai.chat.completions.create.bind(openai.chat.completions)
);

// Use it like normal OpenAI - but with caching!
const response = await cachedCreate({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'How do I center a div?' }]
});
```

## Key Features

✅ **Semantic Caching** - Matches by meaning, not exact text
✅ **Local Embeddings** - Privacy-first, runs entirely client-side
✅ **Persistent Storage** - IndexedDB for cross-session caching
✅ **TTL Support** - Configurable expiration times
✅ **OpenAI Compatible** - Drop-in wrapper for OpenAI SDK
✅ **TypeScript** - Full type safety and IntelliSense

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `similarityThreshold` | number | 0.95 | Min similarity (0-1) for cache hit |
| `maxAge` | number | undefined | Max age in ms before expiration |
| `modelName` | string | 'Xenova/all-MiniLM-L6-v2' | Embedding model |
| `debug` | boolean | false | Enable debug logging |
| `storagePrefix` | string | 'nano-llm-cache' | Storage key prefix |

## Testing

Run tests:
```bash
npm test
```

Run tests with UI:
```bash
npm run test:ui
```

## Development

Watch mode for development:
```bash
npm run dev
```

## Publishing to NPM

1. Update version in `package.json`
2. Build: `npm run build`
3. Publish: `npm publish`

## Browser Demo

Open `examples/browser-demo.html` in a browser to see an interactive demo with a beautiful UI.

## Next Steps

1. Read the full [README.md](README.md) for detailed documentation
2. Check out [examples/basic-usage.ts](examples/basic-usage.ts) for more examples
3. Review [CONTRIBUTING.md](CONTRIBUTING.md) if you want to contribute

## Support

- GitHub Issues: [Report bugs or request features]
- Documentation: See README.md
- Examples: See examples/ folder

---

**Made with ❤️ for developers who want to save money on LLM API calls!**
