# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-15

### Added
- Initial release of Nano-LLM-Cache
- Semantic caching using local embeddings (@xenova/transformers)
- Vector similarity search with configurable threshold
- IndexedDB storage for persistent caching
- TTL (Time To Live) support for cache entries
- OpenAI SDK wrapper for drop-in replacement
- Lazy loading of embedding models
- Cache statistics and monitoring
- Comprehensive test suite with vitest
- TypeScript support with full type definitions
- Browser and Node.js compatibility
- Example implementations and demos
- Detailed documentation

### Features
- **Semantic Understanding**: Match prompts by meaning, not exact text
- **Privacy-First**: All embeddings run locally
- **Lightweight**: ~20MB model with CDN caching
- **Fast**: <100ms query time after model load
- **Persistent**: IndexedDB for cross-session storage
- **Configurable**: Similarity threshold, TTL, model selection
- **Developer-Friendly**: Full TypeScript support and examples

## [Unreleased]

### Planned
- Support for multiple embedding models
- Batch query operations
- Cache compression
- Export/import cache functionality
- React hooks for easy integration
- Vue composables
- Advanced analytics and insights
- Custom similarity algorithms
- Multi-language support improvements
