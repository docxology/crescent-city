import { describe, expect, test } from "bun:test";
import { getArticlePages, getSections, tocSummary } from "../src/toc";
import type { TocNode } from "../src/types";

/** Build a minimal TocNode */
function node(
    type: TocNode["type"],
    guid: string,
    children: TocNode[] = [],
    overrides: Partial<TocNode> = {}
): TocNode {
    return {
        prefix: "",
        tocName: "Test Municipality",
        guid,
        parent: null,
        href: "",
        title: `Node ${guid}`,
        number: guid,
        indexNum: guid,
        type,
        label: type === "chapter" ? "Title" : "",
        hideNumber: false,
        children,
        ...overrides,
    };
}

describe("getArticlePages", () => {
    test("returns article-type nodes", () => {
        const article1 = node("article", "a1");
        const article2 = node("article", "a2");
        const chapter = node("chapter", "ch1", [article1, article2]);
        const root = node("code", "root", [chapter]);

        const result = getArticlePages(root);
        expect(result).toHaveLength(2);
        expect(result.map((n) => n.guid)).toEqual(["a1", "a2"]);
    });

    test("returns chapters that directly contain sections (no articles)", () => {
        const section1 = node("section", "s1");
        const section2 = node("section", "s2");
        const chapterDirect = node("chapter", "ch-direct", [section1, section2]);
        const root = node("code", "root", [chapterDirect]);

        const result = getArticlePages(root);
        expect(result).toHaveLength(1);
        expect(result[0].guid).toBe("ch-direct");
    });

    test("excludes chapters that contain articles (even if they also contain sections)", () => {
        const article = node("article", "a1");
        const section = node("section", "s1");
        const chapter = node("chapter", "ch1", [article, section]);
        const root = node("code", "root", [chapter]);

        const result = getArticlePages(root);
        // Should only contain the article, not the chapter itself
        expect(result.map((n) => n.guid)).toContain("a1");
        expect(result.map((n) => n.guid)).not.toContain("ch1");
    });

    test("returns empty array for tree with no articles or scrapable chapters", () => {
        const root = node("code", "root", [node("division", "d1")]);
        const result = getArticlePages(root);
        expect(result).toHaveLength(0);
    });
});

describe("getSections", () => {
    test("returns only section-type nodes", () => {
        const s1 = node("section", "s1");
        const s2 = node("section", "s2");
        const article = node("article", "a1", [s1, s2]);
        const chapter = node("chapter", "ch1", [article]);
        const root = node("code", "root", [chapter]);

        const result = getSections(root);
        expect(result).toHaveLength(2);
        expect(result.every((n) => n.type === "section")).toBe(true);
    });

    test("returns empty for tree with no sections", () => {
        const root = node("code", "root", [node("chapter", "ch1")]);
        expect(getSections(root)).toHaveLength(0);
    });

    test("finds deeply nested sections", () => {
        const s1 = node("section", "deep-s");
        const sub = node("subarticle", "sub1", [s1]);
        const art = node("article", "a1", [sub]);
        const ch = node("chapter", "ch1", [art]);
        const root = node("code", "root", [ch]);

        const result = getSections(root);
        expect(result).toHaveLength(1);
        expect(result[0].guid).toBe("deep-s");
    });
});

describe("tocSummary", () => {
    test("includes municipality name", () => {
        const root = node("code", "root", [], { tocName: "Crescent City" });
        const summary = tocSummary(root);
        expect(summary).toContain("Crescent City");
    });

    test("includes type counts", () => {
        const s1 = node("section", "s1");
        const s2 = node("section", "s2");
        const art = node("article", "a1", [s1, s2]);
        const root = node("code", "root", [art]);

        const summary = tocSummary(root);
        expect(summary).toContain("section: 2");
        expect(summary).toContain("article: 1");
        expect(summary).toContain("code: 1");
        expect(summary).toContain("Total nodes: 4");
    });

    test("returns a non-empty multi-line string", () => {
        const root = node("code", "root");
        const summary = tocSummary(root);
        expect(summary.split("\n").length).toBeGreaterThanOrEqual(2);
    });
});
