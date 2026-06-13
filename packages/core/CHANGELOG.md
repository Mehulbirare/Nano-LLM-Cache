# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-06-13

### Added
- Node.js filesystem storage backend (with in-memory fallback) so the cache no longer requires IndexedDB
- `maxEntries` config option with LRU eviction
- `delete(prompt, contextHash?)` for single-entry invalidation
- `ChatWrapperOptions.shouldCache` predicate to opt requests out of caching
- Multimodal/tool message support: array and `null` message content, and `tool`/`function` roles

### Changed
- `getStats()` now reads from the in-memory index instead of re-reading storage
- Wrapper response caching is best-effort — a storage failure no longer fails the completion
- `serializeContext` uses an unambiguous JSON encoding to avoid context-hash collisions

### Fixed
- TTL is now enforced on read, so expired entries never produce a hit before the sweep
- Streaming (`stream: true`) and multi-completion (`n > 1`) requests are passed through uncached
- Embedding dimension mismatches (e.g. switching models under one prefix) are skipped instead of throwing
- `clear()` can no longer be clobbered by an in-flight index hydration
- Corrected `exports` condition ordering in package.json so `types` resolve for consumers

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
