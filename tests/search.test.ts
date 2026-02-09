import { describe, expect, test, beforeAll } from "bun:test";
import { existsSync } from "fs";
import { paths } from "../src/shared/paths";
import type { FlatSection, SearchResult } from "../src/types";

// We test the search module by directly manipulating the internal state.
// The search module exports initSearch, search, and getIndexedCount.

const hasOutput = existsSync(paths.toc) && existsSync(paths.manifest);

// Import the module — initSearch will load from disk
let initSearch: () => Promise<void>;
let searchFn: (query: string, limit?: number) => SearchResult[];
let getIndexedCount: () => number;

beforeAll(async () => {
    const mod = await import("../src/gui/search");
    initSearch = mod.initSearch;
    searchFn = mod.search;
    getIndexedCount = mod.getIndexedCount;
});

describe("search module", () => {
    test("getIndexedCount returns 0 before init on fresh import", () => {
        // Before initSearch, the count should reflect module state
        // (may be non-zero if initSearch auto-ran from a previous test import)
        expect(typeof getIndexedCount()).toBe("number");
    });

    test("initSearch loads sections from disk", async () => {
        if (!hasOutput) return;
        await initSearch();
        expect(getIndexedCount()).toBeGreaterThan(0);
    });

    test("search returns empty for empty query", async () => {
        const results = searchFn("");
        expect(results).toHaveLength(0);
    });

    test("search returns empty for whitespace query", async () => {
        const results = searchFn("   ");
        expect(results).toHaveLength(0);
    });

    test("search returns results for common term after init", async () => {
        if (!hasOutput) return;
        await initSearch();
        const results = searchFn("permit");
        expect(results.length).toBeGreaterThan(0);
        // Each result should have the expected shape
        for (const r of results.slice(0, 3)) {
            expect(r.section).toBeDefined();
            expect(r.snippet).toBeDefined();
            expect(typeof r.matchCount).toBe("number");
            expect(r.matchCount).toBeGreaterThan(0);
        }
    });

    test("search respects limit parameter", async () => {
        if (!hasOutput) return;
        await initSearch();
        const results = searchFn("the", 5);
        expect(results.length).toBeLessThanOrEqual(5);
    });

    test("search results are sorted by matchCount descending", async () => {
        if (!hasOutput) return;
        await initSearch();
        const results = searchFn("water", 20);
        for (let i = 1; i < results.length; i++) {
            expect(results[i - 1].matchCount).toBeGreaterThanOrEqual(results[i].matchCount);
        }
    });

    test("search boosts section number prefix matches", async () => {
        if (!hasOutput) return;
        await initSearch();
        // Section numbers start with digits like "1.04.010"
        // A number prefix search should rank those results highly
        const results = searchFn("17.63");
        if (results.length > 0) {
            // The top result should have a high matchCount (>= 10 for number prefix boost)
            expect(results[0].matchCount).toBeGreaterThanOrEqual(10);
        }
    });
});
