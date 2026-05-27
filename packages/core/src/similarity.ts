/**
 * Calculate cosine similarity between two vectors
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Similarity score between 0 and 1
 */
export function calculateSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
        throw new Error('Vectors must have the same length');
    }

    if (vecA.length === 0) {
        return 0;
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        magnitudeA += vecA[i] * vecA[i];
        magnitudeB += vecB[i] * vecB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0;
    }

    const similarity = dotProduct / (magnitudeA * magnitudeB);

    return Math.max(0, Math.min(1, similarity));
}

/**
 * Normalize a vector to unit length
 * @param vec - Input vector
 * @returns Normalized vector
 */
export function normalizeVector(vec: number[]): number[] {
    const magnitude = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));

    if (magnitude === 0) {
        return vec;
    }

    return vec.map(val => val / magnitude);
}

/**
 * Convert array-like object to regular array
 * @param arrayLike - Array-like object (e.g., Float32Array)
 * @returns Regular number array
 */
export function toArray(arrayLike: ArrayLike<number>): number[] {
    return Array.from(arrayLike);
}

/**
 * Fast cosine similarity for pre-normalized Float32Array vectors.
 * Embeddings from transformers.js are L2-normalized, so cosine = dot product.
 * Skipping magnitude computation makes this ~3x faster than the generic path,
 * and Float32Array math is faster than plain number arrays.
 */
export function dotF32(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
        throw new Error('Vectors must have the same length');
    }
    let sum = 0;
    const len = a.length;
    for (let i = 0; i < len; i++) {
        sum += a[i] * b[i];
    }
    return Math.max(0, Math.min(1, sum));
}

/**
 * SHA-256 hash of a string, returned as hex.
 * Uses Web Crypto, available in browsers and Node 18+.
 */
export async function sha256Hex(input: string): Promise<string> {
    const cryptoObj = getCrypto();
    const data = new TextEncoder().encode(input);
    const hashBuffer = await cryptoObj.subtle.digest('SHA-256', data);
    const bytes = new Uint8Array(hashBuffer);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
}

function getCrypto(): Crypto {
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
        return globalThis.crypto;
    }
    throw new Error('Web Crypto API not available. Requires Node 18+ or a modern browser.');
}
