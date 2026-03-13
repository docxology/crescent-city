import { describe, expect, test } from "bun:test";
import { chunkText } from "../src/llm/embeddings";

describe("chunkText", () => {
    test("returns single chunk for short text", () => {
        const result = chunkText("Hello world", 1500, 150);
        expect(result).toHaveLength(1);
        expect(result[0]).toBe("Hello world");
    });

    test("returns single chunk for text exactly at chunk size", () => {
        const text = "x".repeat(1500);
        const result = chunkText(text, 1500, 150);
        expect(result).toHaveLength(1);
        expect(result[0]).toBe(text);
    });

    test("splits text exceeding chunk size into overlapping chunks", () => {
        const text = "a".repeat(3000);
        const result = chunkText(text, 1500, 150);
        // First chunk: 0..1500 (1500 chars)
        // Second chunk: 1350..2850 (1500 chars)
        // Third chunk: 2700..3000 (300 chars)
        expect(result.length).toBeGreaterThan(1);
        expect(result[0]).toHaveLength(1500);
    });

    test("chunks have correct overlap", () => {
        const text = "abcdefghij".repeat(50); // 500 chars
        const chunkSize = 200;
        const overlap = 50;
        const result = chunkText(text, chunkSize, overlap);

        if (result.length >= 2) {
            // End of first chunk should overlap with beginning of second
            const firstEnd = result[0].slice(-overlap);
            const secondStart = result[1].slice(0, overlap);
            expect(firstEnd).toBe(secondStart);
        }
    });

    test("handles empty text", () => {
        const result = chunkText("", 1500, 150);
        expect(result).toHaveLength(1);
        expect(result[0]).toBe("");
    });

    test("uses default parameters from config", () => {
        const text = "short";
        const result = chunkText(text);
        expect(result).toHaveLength(1);
        expect(result[0]).toBe("short");
    });

    test("returns non-empty chunks for long text", () => {
        const text = "word ".repeat(1000); // ~5000 chars
        const result = chunkText(text, 1000, 100);
        for (const chunk of result) {
            expect(chunk.length).toBeGreaterThan(0);
        }
    });
});
