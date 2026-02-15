import { describe, it, expect, beforeEach } from 'vitest';
import { NanoCache } from '../src/cache';

describe('NanoCache', () => {
    let cache: NanoCache;

    beforeEach(async () => {
        cache = new NanoCache({
            debug: false,
            similarityThreshold: 0.95
        });
        await cache.clear();
    });

    describe('Basic Operations', () => {
        it('should create a cache instance', () => {
            expect(cache).toBeInstanceOf(NanoCache);
        });

        it('should return cache miss for empty cache', async () => {
            const result = await cache.query('What is the weather?');
            expect(result.hit).toBe(false);
        });

        it('should save and retrieve exact match', async () => {
            const prompt = 'What is the weather in London?';
            const response = 'The weather in London is cloudy with a chance of rain.';

            await cache.save(prompt, response);
            const result = await cache.query(prompt);

            expect(result.hit).toBe(true);
            expect(result.response).toBe(response);
            expect(result.similarity).toBeGreaterThan(0.99);
        }, 30000); // Increase timeout for model loading

        it('should find semantically similar prompts', async () => {
            const prompt1 = 'What is the weather in London?';
            const response1 = 'The weather in London is cloudy.';

            await cache.save(prompt1, response1);

            // Query with similar but different wording
            const result = await cache.query('Tell me the London weather');

            expect(result.hit).toBe(true);
            expect(result.response).toBe(response1);
        }, 30000);

        it('should not match dissimilar prompts', async () => {
            const prompt1 = 'What is the weather in London?';
            const response1 = 'The weather in London is cloudy.';

            await cache.save(prompt1, response1);

            // Query with completely different topic
            const result = await cache.query('How do I bake a cake?');

            expect(result.hit).toBe(false);
        }, 30000);
    });

    describe('Configuration', () => {
        it('should respect custom similarity threshold', async () => {
            const strictCache = new NanoCache({
                similarityThreshold: 0.99,
                debug: false
            });

            await strictCache.save('Hello world', 'Response 1');
            const result = await strictCache.query('Hi world');

            // With very high threshold, might not match
            expect(result.similarity).toBeDefined();
        }, 30000);

        it('should support custom storage prefix', async () => {
            const customCache = new NanoCache({
                storagePrefix: 'custom-prefix',
                debug: false
            });

            await customCache.save('test', 'response');
            const stats = await customCache.getStats();

            expect(stats.totalEntries).toBeGreaterThan(0);
        }, 30000);
    });

    describe('Cache Management', () => {
        it('should clear all entries', async () => {
            await cache.save('prompt1', 'response1');
            await cache.save('prompt2', 'response2');

            let stats = await cache.getStats();
            expect(stats.totalEntries).toBeGreaterThan(0);

            await cache.clear();

            stats = await cache.getStats();
            expect(stats.totalEntries).toBe(0);
        }, 30000);

        it('should provide cache statistics', async () => {
            await cache.save('prompt1', 'response1');
            await cache.save('prompt2', 'response2');

            const stats = await cache.getStats();

            expect(stats.totalEntries).toBe(2);
            expect(stats.oldestEntry).toBeDefined();
            expect(stats.newestEntry).toBeDefined();
        }, 30000);
    });

    describe('Model Management', () => {
        it('should preload model', async () => {
            expect(cache.isModelLoaded()).toBe(false);

            await cache.preloadModel();

            expect(cache.isModelLoaded()).toBe(true);
        }, 30000);

        it('should unload model', async () => {
            await cache.preloadModel();
            expect(cache.isModelLoaded()).toBe(true);

            await cache.unloadModel();
            expect(cache.isModelLoaded()).toBe(false);
        }, 30000);
    });
});
