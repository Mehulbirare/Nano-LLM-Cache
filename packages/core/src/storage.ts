import type { CacheEntry } from './types';

/**
 * Minimal key/value backend abstraction so the cache can run in the browser
 * (IndexedDB), in Node (filesystem), or anywhere else (in-memory fallback).
 */
interface StorageBackend {
    get(key: string): Promise<CacheEntry | undefined>;
    set(key: string, value: CacheEntry): Promise<void>;
    del(key: string): Promise<void>;
    keys(): Promise<string[]>;
}

async function createIdbBackend(): Promise<StorageBackend> {
    const { get, set, del, keys } = await import('idb-keyval');
    return {
        get: (k) => get<CacheEntry>(k),
        set: (k, v) => set(k, v),
        del: (k) => del(k),
        keys: async () => (await keys()).filter((k): k is string => typeof k === 'string')
    };
}

/**
 * Filesystem-backed store for Node. All keys live in a single JSON file under
 * the OS temp dir so the cache persists across process restarts. Writes are
 * serialized to avoid interleaving snapshots.
 */
async function createFsBackend(): Promise<StorageBackend> {
    // Indirect specifiers + @vite-ignore keep browser bundlers from trying to
    // resolve Node builtins at build time.
    const fsName = 'node:fs/promises';
    const pathName = 'node:path';
    const osName = 'node:os';
    const fs = await import(/* @vite-ignore */ fsName);
    const path = await import(/* @vite-ignore */ pathName);
    const os = await import(/* @vite-ignore */ osName);

    const dir = path.join(os.tmpdir(), 'nano-llm-cache');
    const file = path.join(dir, 'store.json');

    let data: Record<string, CacheEntry> | null = null;
    let writeChain: Promise<void> = Promise.resolve();

    async function load(): Promise<Record<string, CacheEntry>> {
        if (data) return data;
        try {
            data = JSON.parse(await fs.readFile(file, 'utf8'));
        } catch {
            data = {};
        }
        return data!;
    }

    function persist(): Promise<void> {
        const snapshot = JSON.stringify(data ?? {});
        writeChain = writeChain.then(async () => {
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(file, snapshot, 'utf8');
        });
        return writeChain;
    }

    return {
        get: async (k) => (await load())[k],
        set: async (k, v) => {
            (await load())[k] = v;
            await persist();
        },
        del: async (k) => {
            delete (await load())[k];
            await persist();
        },
        keys: async () => Object.keys(await load())
    };
}

function createMemoryBackend(): StorageBackend {
    const map = new Map<string, CacheEntry>();
    return {
        get: async (k) => map.get(k),
        set: async (k, v) => {
            map.set(k, v);
        },
        del: async (k) => {
            map.delete(k);
        },
        keys: async () => [...map.keys()]
    };
}

let backendPromise: Promise<StorageBackend> | null = null;

function getBackend(): Promise<StorageBackend> {
    if (!backendPromise) {
        backendPromise = (async () => {
            if (typeof globalThis !== 'undefined' && (globalThis as { indexedDB?: unknown }).indexedDB) {
                try {
                    return await createIdbBackend();
                } catch {
                    /* fall through */
                }
            }
            if (typeof process !== 'undefined' && process.versions?.node) {
                try {
                    return await createFsBackend();
                } catch {
                    /* fall through */
                }
            }
            return createMemoryBackend();
        })();
    }
    return backendPromise;
}

/**
 * Storage manager for cache entries.
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

    private isOurKey(key: string): boolean {
        return key.startsWith(this.keyPrefix);
    }

    private extractId(key: string): string {
        return key.slice(this.keyPrefix.length);
    }

    async save(id: string, entry: CacheEntry): Promise<void> {
        const backend = await getBackend();
        await backend.set(this.getKey(id), entry);
    }

    async get(id: string): Promise<CacheEntry | undefined> {
        const backend = await getBackend();
        return await backend.get(this.getKey(id));
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
        const backend = await getBackend();
        const allKeys = await backend.keys();
        const result: Array<{ id: string; entry: CacheEntry }> = [];
        for (const key of allKeys) {
            if (!this.isOurKey(key)) continue;
            const entry = await backend.get(key);
            if (entry) {
                result.push({ id: this.extractId(key), entry });
            }
        }
        return result;
    }

    async delete(id: string): Promise<void> {
        const backend = await getBackend();
        await backend.del(this.getKey(id));
    }

    async clear(): Promise<void> {
        const backend = await getBackend();
        const allKeys = await backend.keys();
        for (const key of allKeys) {
            if (this.isOurKey(key)) {
                await backend.del(key);
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
