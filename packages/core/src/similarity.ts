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

    // Calculate dot product
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        magnitudeA += vecA[i] * vecA[i];
        magnitudeB += vecB[i] * vecB[i];
    }

    // Calculate magnitudes
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    // Avoid division by zero
    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0;
    }

    // Calculate cosine similarity
    const similarity = dotProduct / (magnitudeA * magnitudeB);

    // Clamp to [0, 1] range (handle floating point errors)
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
