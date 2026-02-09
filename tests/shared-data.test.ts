import { describe, expect, test } from "bun:test";
import { existsSync } from "fs";
import {
    loadToc,
    loadManifest,
    loadAllArticles,
    loadAllSections,
    searchSections,
} from "../src/shared/data";
import { paths } from "../src/shared/paths";

// These tests run against real output/ data if present, otherwise skip gracefully.

const hasOutput = existsSync(paths.toc) && existsSync(paths.manifest);

describe("shared/data", () => {
    test("loadToc returns a TocNode with expected fields", async () => {
        if (!hasOutput) return; // skip if no scraped data
        const toc = await loadToc();
        expect(toc).toBeDefined();
        expect(toc.guid).toBeDefined();
        expect(toc.tocName).toBeDefined();
        expect(Array.isArray(toc.children)).toBe(true);
        expect(toc.type).toBe("code");
    });

    test("loadManifest returns a ScrapeManifest with expected fields", async () => {
        if (!hasOutput) return;
        const manifest = await loadManifest();
        expect(manifest).toBeDefined();
        expect(manifest.municipality).toBeDefined();
        expect(typeof manifest.articlePageCount).toBe("number");
        expect(typeof manifest.sectionCount).toBe("number");
        expect(manifest.articles).toBeDefined();
        expect(typeof manifest.articles).toBe("object");
    });

    test("loadAllArticles returns array of ArticlePage objects", async () => {
        if (!hasOutput) return;
        const articles = await loadAllArticles();
        expect(Array.isArray(articles)).toBe(true);
        if (articles.length > 0) {
            const first = articles[0];
            expect(first.guid).toBeDefined();
            expect(first.url).toBeDefined();
            expect(first.title).toBeDefined();
            expect(Array.isArray(first.sections)).toBe(true);
            expect(first.sha256).toMatch(/^[0-9a-f]{64}$/);
        }
    });

    test("loadAllSections returns FlatSection array with article metadata", async () => {
        if (!hasOutput) return;
        const sections = await loadAllSections();
        expect(Array.isArray(sections)).toBe(true);
        if (sections.length > 0) {
            const first = sections[0];
            expect(first.guid).toBeDefined();
            expect(first.number).toBeDefined();
            expect(first.title).toBeDefined();
            expect(first.text).toBeDefined();
            expect(first.articleGuid).toBeDefined();
            expect(first.articleTitle).toBeDefined();
        }
    });

    test("searchSections filters by substring in number, title, or text", async () => {
        if (!hasOutput) return;
        const all = await loadAllSections();
        if (all.length === 0) return;

        // Search by a known pattern — the word "the" should match many sections
        const results = await searchSections("the", all);
        expect(results.length).toBeGreaterThan(0);
        expect(results.length).toBeLessThanOrEqual(all.length);
    });

    test("searchSections returns empty array for nonsense query", async () => {
        if (!hasOutput) return;
        const all = await loadAllSections();
        const results = await searchSections("xyzzy_totally_impossible_query_12345", all);
        expect(results).toHaveLength(0);
    });
});
