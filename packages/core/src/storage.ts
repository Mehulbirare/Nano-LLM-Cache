import { get, set, del, keys } from 'idb-keyval';
import type { CacheEntry } from './types';

/**
 * Storage manager for cache entries using IndexedDB.
 * Owns the storage layer only — expiry, indexing, and hashing live in NanoCache.
 */
export class CacheStorage {
    private keyPrefix: string;

    constructor(prefix: string = 'nano-llm-cache') {
        this.keyPrefix = `${prefix}:`;
    }

    private getKey(id: string): string {
        return `${this.keyPrefix}${id}`;
    }

    private isOurKey(key: IDBValidKey): key is string {
        return typeof key === 'string' && key.startsWith(this.keyPrefix);
    }

    private extractId(key: string): string {
        return key.slice(this.keyPrefix.length);
    }

    async save(id: string, entry: CacheEntry): Promise<void> {
        await set(this.getKey(id), entry);
    }

    async get(id: string): Promise<CacheEntry | undefined> {
        return await get(this.getKey(id));
    }

    async getAll(): Promise<CacheEntry[]> {
        const withIds = await this.getAllWithIds();
        return withIds.map(({ entry }) => entry);
    }

    /**
     * Get all cache entries paired with their storage IDs.
     * Used by NanoCache to hydrate its in-memory index.
     */
    async getAllWithIds(): Promise<Array<{ id: string; entry: CacheEntry }>> {
        const allKeys = await keys();
        const result: Array<{ id: string; entry: CacheEntry }> = [];
        for (const key of allKeys) {
            if (!this.isOurKey(key)) continue;
            const entry = await get(key);
            if (entry) {
                result.push({ id: this.extractId(key), entry });
            }
        }
        return result;
    }

    async delete(id: string): Promise<void> {
        await del(this.getKey(id));
    }

    async clear(): Promise<void> {
        const allKeys = await keys();
        for (const key of allKeys) {
            if (this.isOurKey(key)) {
                await del(key);
            }
        }
    }

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
