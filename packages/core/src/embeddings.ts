import { pipeline, env } from '@xenova/transformers';
import type { Pipeline } from '@xenova/transformers';
import { toArray } from './similarity';

// Configure transformers to use CDN caching
env.allowLocalModels = false;
env.useBrowserCache = true;

/**
 * Embedding generator using Xenova Transformers
 */
export class EmbeddingGenerator {
    private model: Pipeline | null = null;
    private modelName: string;
    private loading: Promise<void> | null = null;
    private debug: boolean;

    constructor(modelName: string = 'Xenova/all-MiniLM-L6-v2', debug: boolean = false) {
        this.modelName = modelName;
        this.debug = debug;
    }

    /**
     * Initialize the embedding model (lazy loading)
     */
    private async initialize(): Promise<void> {
        if (this.model) {
            return;
        }

        // If already loading, wait for it
        if (this.loading) {
            await this.loading;
            return;
        }

        // Start loading
        this.loading = (async () => {
            try {
                if (this.debug) {
                    console.log(`[NanoCache] Loading embedding model: ${this.modelName}`);
                }

                this.model = await pipeline('feature-extraction', this.modelName);

                if (this.debug) {
                    console.log('[NanoCache] Embedding model loaded successfully');
                }
            } catch (error) {
                this.loading = null;
                throw new Error(`Failed to load embedding model: ${error}`);
            }
        })();

        await this.loading;
    }

    /**
     * Generate embedding for a text prompt
     */
    async generate(text: string): Promise<number[]> {
        await this.initialize();

        if (!this.model) {
            throw new Error('Embedding model not initialized');
        }

        try {
            // Generate embeddings
            const output = await this.model(text, {
                pooling: 'mean',
                normalize: true
            });

            // Extract the embedding array
            let embedding: number[];

            if (output.data) {
                embedding = toArray(output.data);
            } else if (Array.isArray(output)) {
                embedding = output;
            } else {
                throw new Error('Unexpected embedding output format');
            }

            if (this.debug) {
                console.log(`[NanoCache] Generated embedding of length ${embedding.length}`);
            }

            return embedding;
        } catch (error) {
            throw new Error(`Failed to generate embedding: ${error}`);
        }
    }

    /**
     * Generate embeddings for multiple texts in batch
     */
    async generateBatch(texts: string[]): Promise<number[][]> {
        await this.initialize();

        if (!this.model) {
            throw new Error('Embedding model not initialized');
        }

        const embeddings: number[][] = [];

        for (const text of texts) {
            const embedding = await this.generate(text);
            embeddings.push(embedding);
        }

        return embeddings;
    }

    /**
     * Check if model is loaded
     */
    isLoaded(): boolean {
        return this.model !== null;
    }

    /**
     * Unload the model to free memory
     */
    async unload(): Promise<void> {
        this.model = null;
        this.loading = null;

        if (this.debug) {
            console.log('[NanoCache] Embedding model unloaded');
        }
    }
}
