import { describe, expect, test } from "bun:test";
import { powerIteration, computeWordLoadings, kmeans } from "../src/gui/analytics";

// inferTitle is not exported, so we test it indirectly through getCodeStats
// or we test the pattern it uses directly

describe("Analytics", () => {
    test("powerIteration finds eigenvector for simple 2D diagonal matrix", () => {
        // Matrix X = [[2, 0], [0, 1]]
        // X^T X = [[4, 0], [0, 1]]
        // Eigenvalues are 4 and 1. Eigenvectors are [1, 0] and [0, 1].
        const data = [
            new Float64Array([2, 0]),
            new Float64Array([0, 1]),
        ];
        const dim = 2;

        const result = powerIteration(data, dim, null);

        // Should find [1, 0] or [-1, 0]
        expect(result.eigenvalue).toBeCloseTo(4, 0.1);

        expect(Math.abs(result.vector[0])).toBeGreaterThan(0.9);
        expect(Math.abs(result.vector[1])).toBeLessThan(0.1);
    });

    test("powerIteration returns zero eigenvalue for zero matrix", () => {
        const data = [
            new Float64Array([0, 0]),
            new Float64Array([0, 0]),
        ];
        const result = powerIteration(data, 2, null);
        expect(result.eigenvalue).toBe(0);
    });

    test("computeWordLoadings identifies correlated terms", () => {
        const docs = [
            "apple apple",
            "banana banana",
            "apple banana",
        ];

        const projections = [
            [10, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [-10, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ];

        const loadings = computeWordLoadings(docs, projections, []);

        const apple = loadings.find(l => l.word === "apple");
        expect(apple).toBeDefined();
        expect(apple?.correlations[0]).toBeGreaterThan(0);

        const banana = loadings.find(l => l.word === "banana");
        expect(banana).toBeDefined();
        expect(banana?.correlations[0]).toBeLessThan(0);
    });

    test("computeWordLoadings returns empty for empty docs", () => {
        const result = computeWordLoadings([], [], []);
        expect(result).toEqual([]);
    });

    test("kmeans clusters simple 2D points", () => {
        const data = [
            [0, 0], [1, 0], [0, 1],
            [10, 10], [11, 10], [10, 11]
        ];

        const k = 2;
        const result = kmeans(data, k);

        expect(result.centroids.length).toBe(2);
        expect(result.assignments.length).toBe(6);

        // First 3 should be in same cluster
        const c1 = result.assignments[0];
        expect(result.assignments[1]).toBe(c1);
        expect(result.assignments[2]).toBe(c1);

        // Last 3 should be in same cluster (different from c1)
        const c2 = result.assignments[3];
        expect(result.assignments[4]).toBe(c2);
        expect(result.assignments[5]).toBe(c2);

        expect(c1).not.toBe(c2);
    });

    test("kmeans converges and returns correct structure", () => {
        const data = [[1], [2], [100], [101]];
        const result = kmeans(data, 2);
        expect(result.centroids).toHaveLength(2);
        expect(result.assignments).toHaveLength(4);
        // Points 0,1 should be same cluster, points 2,3 should be same cluster
        expect(result.assignments[0]).toBe(result.assignments[1]);
        expect(result.assignments[2]).toBe(result.assignments[3]);
        expect(result.assignments[0]).not.toBe(result.assignments[2]);
    });
});
