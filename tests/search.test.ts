import { describe, expect, test, beforeAll } from "bun:test";
import { existsSync } from "fs";
import { paths } from "../src/shared/paths";
import type { FlatSection, SearchResult } from "../src/types";
import type { PagedSearchResult } from "../src/gui/search";

// We test the search module by importing it directly.
// search() now returns PagedSearchResult (not an array).

const hasOutput = existsSync(paths.toc) && existsSync(paths.manifest);

let initSearch: () => Promise<void>;
let searchFn: (query: string, options?: any) => PagedSearchResult;
let searchSimpleFn: (query: string, limit?: number) => SearchResult[];
let getIndexedCount: () => number;

beforeAll(async () => {
    const mod = await import("../src/gui/search");
    initSearch = mod.initSearch;
    searchFn = mod.search;
    searchSimpleFn = mod.searchSimple;
    getIndexedCount = mod.getIndexedCount;
});

describe("search module", () => {
    test("getIndexedCount returns a number before init", () => {
        expect(typeof getIndexedCount()).toBe("number");
    });

    test("initSearch loads sections from disk", async () => {
        if (!hasOutput) return;
        await initSearch();
        expect(getIndexedCount()).toBeGreaterThan(0);
    });

    test("search returns empty results for empty query", async () => {
        const result = searchFn("");
        expect(result.results).toHaveLength(0);
        expect(result.total).toBe(0);
    });

    test("search returns empty results for whitespace query", async () => {
        const result = searchFn("   ");
        expect(result.results).toHaveLength(0);
        expect(result.total).toBe(0);
    });

    test("search returns PagedSearchResult with total/offset/limit fields", async () => {
        if (!hasOutput) return;
        await initSearch();
        const result = searchFn("permit", { limit: 10, offset: 0 });
        expect(typeof result.total).toBe("number");
        expect(result.offset).toBe(0);
        expect(result.limit).toBe(10);
        expect(result.results.length).toBeLessThanOrEqual(10);
    });

    test("search returns results for common term after init", async () => {
        if (!hasOutput) return;
        await initSearch();
        const result = searchFn("permit");
        expect(result.results.length).toBeGreaterThan(0);
        for (const r of result.results.slice(0, 3)) {
            expect(r.section).toBeDefined();
            expect(r.snippet).toBeDefined();
            expect(typeof r.matchCount).toBe("number");
            expect(r.matchCount).toBeGreaterThan(0);
        }
    });

    test("search respects limit via options", async () => {
        if (!hasOutput) return;
        await initSearch();
        const result = searchFn("the", { limit: 5 });
        expect(result.results.length).toBeLessThanOrEqual(5);
    });

    test("search results are sorted by matchCount descending", async () => {
        if (!hasOutput) return;
        await initSearch();
        const result = searchFn("water", { limit: 20 });
        for (let i = 1; i < result.results.length; i++) {
            expect(result.results[i - 1].matchCount).toBeGreaterThanOrEqual(result.results[i].matchCount);
        }
    });

    test("searchSimple backward-compat returns an array", async () => {
        if (!hasOutput) return;
        await initSearch();
        const results = searchSimpleFn("permit", 5);
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeLessThanOrEqual(5);
    });

    test("search titleFilter scopes results to given title number", async () => {
        if (!hasOutput) return;
        await initSearch();
        const result = searchFn("zone", { limit: 20, titleFilter: "17" });
        // All results should have numbers starting with 17.
        for (const r of result.results) {
            const num = r.section.number.replace(/§\s*/, "").trim();
            expect(num).toMatch(/^17\./);
        }
    });

    test("search highlight wraps matched text in <mark>", async () => {
        if (!hasOutput) return;
        await initSearch();
        const result = searchFn("tsunami", { limit: 5, highlight: true });
        if (result.results.length > 0) {
            const hasHighlight = result.results.some(r => r.snippet.includes("<mark>"));
            expect(hasHighlight).toBe(true);
        }
    });

    test("search boosts section number prefix matches", async () => {
        if (!hasOutput) return;
        await initSearch();
        const result = searchFn("17.63");
        if (result.results.length > 0) {
            // Number prefix boost adds 20 to score
            expect(result.results[0].matchCount).toBeGreaterThanOrEqual(10);
        }
    });
});
