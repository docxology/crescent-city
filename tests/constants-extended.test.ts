import { describe, expect, test } from "bun:test";
import {
    BASE_URL,
    MUNICIPALITY_CODE,
    OUTPUT_DIR,
    ARTICLES_DIR,
    RATE_LIMIT_MS,
    SCRAPE_TIMEOUT_MS,
    CLOUDFLARE_WAIT_MS,
    SPA_RENDER_MS,
    MAX_RETRIES,
    VERIFY_SAMPLE_SIZE,
    EMBED_BATCH_SIZE,
    OLLAMA_TIMEOUT_MS,
} from "../src/constants";

describe("extended constants", () => {
    test("SCRAPE_TIMEOUT_MS is a positive number", () => {
        expect(typeof SCRAPE_TIMEOUT_MS).toBe("number");
        expect(SCRAPE_TIMEOUT_MS).toBeGreaterThan(0);
    });

    test("CLOUDFLARE_WAIT_MS is a positive number", () => {
        expect(typeof CLOUDFLARE_WAIT_MS).toBe("number");
        expect(CLOUDFLARE_WAIT_MS).toBeGreaterThan(0);
    });

    test("SPA_RENDER_MS is a positive number", () => {
        expect(typeof SPA_RENDER_MS).toBe("number");
        expect(SPA_RENDER_MS).toBeGreaterThan(0);
    });

    test("MAX_RETRIES is a positive number", () => {
        expect(typeof MAX_RETRIES).toBe("number");
        expect(MAX_RETRIES).toBeGreaterThan(0);
    });

    test("VERIFY_SAMPLE_SIZE is a positive number", () => {
        expect(typeof VERIFY_SAMPLE_SIZE).toBe("number");
        expect(VERIFY_SAMPLE_SIZE).toBeGreaterThan(0);
    });

    test("EMBED_BATCH_SIZE is a positive number", () => {
        expect(typeof EMBED_BATCH_SIZE).toBe("number");
        expect(EMBED_BATCH_SIZE).toBeGreaterThan(0);
    });

    test("OLLAMA_TIMEOUT_MS is a positive number", () => {
        expect(typeof OLLAMA_TIMEOUT_MS).toBe("number");
        expect(OLLAMA_TIMEOUT_MS).toBeGreaterThan(0);
    });

    test("RATE_LIMIT_MS defaults to 2000", () => {
        // Unless env var override is set
        expect(RATE_LIMIT_MS).toBe(2000);
    });

    test("SCRAPE_TIMEOUT_MS defaults to 60000", () => {
        expect(SCRAPE_TIMEOUT_MS).toBe(60000);
    });

    test("Original constants still correct", () => {
        expect(BASE_URL).toBe("https://ecode360.com");
        expect(MUNICIPALITY_CODE).toBe("CR4919");
        expect(OUTPUT_DIR).toBe("output");
        expect(ARTICLES_DIR).toBe("output/articles");
    });
});
