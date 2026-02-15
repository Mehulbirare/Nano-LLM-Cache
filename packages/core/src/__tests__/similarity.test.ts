import { describe, it, expect } from 'vitest';
import { calculateSimilarity, normalizeVector } from '../src/similarity';

describe('Similarity Functions', () => {
    describe('calculateSimilarity', () => {
        it('should return 1 for identical vectors', () => {
            const vec1 = [1, 2, 3, 4];
            const vec2 = [1, 2, 3, 4];

            const similarity = calculateSimilarity(vec1, vec2);
            expect(similarity).toBeCloseTo(1, 5);
        });

        it('should return 0 for orthogonal vectors', () => {
            const vec1 = [1, 0, 0];
            const vec2 = [0, 1, 0];

            const similarity = calculateSimilarity(vec1, vec2);
            expect(similarity).toBeCloseTo(0, 5);
        });

        it('should return high similarity for similar vectors', () => {
            const vec1 = [0.12, -0.44, 0.88, 0.23];
            const vec2 = [0.13, -0.43, 0.89, 0.24];

            const similarity = calculateSimilarity(vec1, vec2);
            expect(similarity).toBeGreaterThan(0.99);
        });

        it('should return low similarity for different vectors', () => {
            const vec1 = [1, 0, 0, 0];
            const vec2 = [0, 0, 0, 1];

            const similarity = calculateSimilarity(vec1, vec2);
            expect(similarity).toBeLessThan(0.1);
        });

        it('should throw error for vectors of different lengths', () => {
            const vec1 = [1, 2, 3];
            const vec2 = [1, 2];

            expect(() => calculateSimilarity(vec1, vec2)).toThrow('Vectors must have the same length');
        });

        it('should return 0 for zero vectors', () => {
            const vec1 = [0, 0, 0];
            const vec2 = [1, 2, 3];

            const similarity = calculateSimilarity(vec1, vec2);
            expect(similarity).toBe(0);
        });

        it('should handle negative values correctly', () => {
            const vec1 = [1, -1, 1, -1];
            const vec2 = [1, -1, 1, -1];

            const similarity = calculateSimilarity(vec1, vec2);
            expect(similarity).toBeCloseTo(1, 5);
        });

        it('should clamp result to [0, 1] range', () => {
            const vec1 = [1, 2, 3];
            const vec2 = [4, 5, 6];

            const similarity = calculateSimilarity(vec1, vec2);
            expect(similarity).toBeGreaterThanOrEqual(0);
            expect(similarity).toBeLessThanOrEqual(1);
        });
    });

    describe('normalizeVector', () => {
        it('should normalize a vector to unit length', () => {
            const vec = [3, 4];
            const normalized = normalizeVector(vec);

            expect(normalized[0]).toBeCloseTo(0.6, 5);
            expect(normalized[1]).toBeCloseTo(0.8, 5);

            // Check magnitude is 1
            const magnitude = Math.sqrt(normalized[0] ** 2 + normalized[1] ** 2);
            expect(magnitude).toBeCloseTo(1, 5);
        });

        it('should handle zero vector', () => {
            const vec = [0, 0, 0];
            const normalized = normalizeVector(vec);

            expect(normalized).toEqual([0, 0, 0]);
        });

        it('should preserve direction', () => {
            const vec = [1, 1, 1];
            const normalized = normalizeVector(vec);

            // All components should be equal (same direction)
            expect(normalized[0]).toBeCloseTo(normalized[1], 5);
            expect(normalized[1]).toBeCloseTo(normalized[2], 5);
        });
    });
});
