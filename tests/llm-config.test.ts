import { describe, expect, test } from "bun:test";
import { llmConfig } from "../src/llm/config";

describe("llmConfig", () => {
    test("ollamaUrl defaults to localhost:11434", () => {
        // Unless OLLAMA_URL env var is set, should be default
        expect(llmConfig.ollamaUrl).toContain("localhost");
        expect(llmConfig.ollamaUrl).toContain("11434");
    });

    test("embeddingModel defaults to nomic-embed-text", () => {
        expect(llmConfig.embeddingModel).toBe("nomic-embed-text");
    });

    test("chatModel defaults to gemma3:4b", () => {
        expect(llmConfig.chatModel).toBe("gemma3:4b");
    });

    test("chromaUrl defaults to localhost:8001", () => {
        expect(llmConfig.chromaUrl).toContain("localhost");
        expect(llmConfig.chromaUrl).toContain("8001");
    });

    test("collectionName is crescent-city-code", () => {
        expect(llmConfig.collectionName).toBe("crescent-city-code");
    });

    test("chunkSize is a positive number", () => {
        expect(typeof llmConfig.chunkSize).toBe("number");
        expect(llmConfig.chunkSize).toBeGreaterThan(0);
        expect(llmConfig.chunkSize).toBe(1500);
    });

    test("chunkOverlap is less than chunkSize", () => {
        expect(llmConfig.chunkOverlap).toBeLessThan(llmConfig.chunkSize);
        expect(llmConfig.chunkOverlap).toBe(150);
    });

    test("topK is a positive number", () => {
        expect(typeof llmConfig.topK).toBe("number");
        expect(llmConfig.topK).toBeGreaterThan(0);
        expect(llmConfig.topK).toBe(10);
    });
});
