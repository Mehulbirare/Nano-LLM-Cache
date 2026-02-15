import { get, set, del, keys } from 'idb-keyval';
import type { CacheEntry } from './types';

/**
 * Storage manager for cache entries using IndexedDB
 */
export class CacheStorage {
    private prefix: string;

    constructor(prefix: string = 'nano-llm-cache') {
        this.prefix = prefix;
    }

    /**
     * Generate storage key
     */
    private getKey(id: string): string {
        return `${this.prefix}:${id}`;
    }

    /**
     * Save a cache entry
     */
    async save(id: string, entry: CacheEntry): Promise<void> {
        await set(this.getKey(id), entry);
    }

    /**
     * Get a cache entry by ID
     */
    async get(id: string): Promise<CacheEntry | undefined> {
        return await get(this.getKey(id));
    }

    /**
     * Get all cache entries
     */
    async getAll(): Promise<CacheEntry[]> {
        const allKeys = await keys();
        const cacheKeys = allKeys.filter(key =>
            typeof key === 'string' && key.startsWith(this.prefix)
        );

        const entries: CacheEntry[] = [];
        for (const key of cacheKeys) {
            const entry = await get(key);
            if (entry) {
                entries.push(entry);
            }
        }

        return entries;
    }

    /**
     * Delete a cache entry
     */
    async delete(id: string): Promise<void> {
        await del(this.getKey(id));
    }

    /**
     * Clear all cache entries
     */
    async clear(): Promise<void> {
        const allKeys = await keys();
        const cacheKeys = allKeys.filter(key =>
            typeof key === 'string' && key.startsWith(this.prefix)
        );

        for (const key of cacheKeys) {
            await del(key);
        }
    }

    /**
     * Remove expired entries based on maxAge
     */
    async removeExpired(maxAge: number): Promise<number> {
        const now = Date.now();
        const entries = await this.getAll();
        let removedCount = 0;

        for (const entry of entries) {
            if (now - entry.timestamp > maxAge) {
                // Generate ID from prompt hash
                const id = this.hashPrompt(entry.prompt);
                await this.delete(id);
                removedCount++;
            }
        }

        return removedCount;
    }

    /**
     * Simple hash function for prompt
     */
    private hashPrompt(prompt: string): string {
        let hash = 0;
        for (let i = 0; i < prompt.length; i++) {
            const char = prompt.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<{
        totalEntries: number;
        oldestEntry: number | null;
        newestEntry: number | null;
    }> {
        const entries = await this.getAll();

        if (entries.length === 0) {
            return {
                totalEntries: 0,
                oldestEntry: null,
                newestEntry: null
            };
        }

        const timestamps = entries.map(e => e.timestamp);

        return {
            totalEntries: entries.length,
            oldestEntry: Math.min(...timestamps),
            newestEntry: Math.max(...timestamps)
        };
    }
}
