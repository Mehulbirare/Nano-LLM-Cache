# Nano-LLM-Cache Monorepo

Welcome to the **Nano-LLM-Cache** project! This repository contains a suite of tools for semantic caching of LLM API calls, designed to save costs and reduce latency.

## 📦 Packages

This repository is organized as a monorepo with the following packages:

- **[`@nano-llm-cache/core`](./packages/core)**: The core library for semantic caching using local embeddings.

## 🔗 Repository

- **GitHub**: [https://github.com/Mehulbirare/Nano-LLM-Cache](https://github.com/Mehulbirare/Nano-LLM-Cache)

## 🚀 Quick Start

Install the core package:

```bash
npm install @nano-llm-cache/core
```

### Basic Usage

```typescript
import { NanoCache } from '@nano-llm-cache/core';

// Create cache instance
const cache = new NanoCache({
  similarityThreshold: 0.95, // 95% similarity required (0-1)
});

// Save a response (e.g. from your LLM)
await cache.save(
  'What is the weather in London?',
  'The weather in London is cloudy with a chance of rain, 15°C.'
);

// Later, query with a similar prompt
// This will return the cached response because the meaning is the same!
const result = await cache.query('Tell me the London weather');

if (result.hit) {
  console.log('Cache HIT!', result.response);
} else {
  console.log('Cache MISS - call your LLM API');
}
```

## 🛠️ Development Getting Started

To get started with development:

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Mehulbirare/Nano-LLM-Cache.git
    cd Nano-LLM-Cache
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Build all packages**:
    ```bash
    npm run build
    ```

## 🤝 Contributing

Contributions are welcome! Please see the [Contributing Guide](./packages/core/CONTRIBUTING.md) for more details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
