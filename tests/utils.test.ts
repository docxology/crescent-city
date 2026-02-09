import { describe, expect, test } from "bun:test";
import {
    computeSha256,
    flattenToc,
    shuffle,
    htmlToText,
    csvEscape,
    sanitizeFilename,
} from "../src/utils";
import type { TocNode } from "../src/types";

/** Helper to build a minimal TocNode for testing */
function mockTocNode(overrides: Partial<TocNode> = {}): TocNode {
    return {
        prefix: "",
        tocName: "Test",
        guid: "g1",
        parent: null,
        href: "",
        title: "Root",
        number: "1",
        indexNum: "1",
        type: "code",
        label: "",
        hideNumber: false,
        children: [],
        ...overrides,
    };
}

describe("computeSha256", () => {
    test("returns 64-char hex string for empty string", async () => {
        const hash = await computeSha256("");
        expect(hash).toHaveLength(64);
        expect(hash).toMatch(/^[0-9a-f]{64}$/);
        // Known SHA-256 of empty string
        expect(hash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    });

    test("returns consistent hash for same input", async () => {
        const h1 = await computeSha256("hello world");
        const h2 = await computeSha256("hello world");
        expect(h1).toBe(h2);
    });

    test("returns different hash for different input", async () => {
        const h1 = await computeSha256("foo");
        const h2 = await computeSha256("bar");
        expect(h1).not.toBe(h2);
    });
});

describe("flattenToc", () => {
    test("returns single-element array for leaf node", () => {
        const leaf = mockTocNode({ guid: "leaf", children: [] });
        const result = flattenToc(leaf);
        expect(result).toHaveLength(1);
        expect(result[0].guid).toBe("leaf");
    });

    test("flattens nested tree correctly", () => {
        const child1 = mockTocNode({ guid: "c1", children: [] });
        const child2 = mockTocNode({ guid: "c2", children: [] });
        const grandchild = mockTocNode({ guid: "gc1", children: [] });
        const child3 = mockTocNode({ guid: "c3", children: [grandchild] });
        const root = mockTocNode({ guid: "root", children: [child1, child2, child3] });

        const result = flattenToc(root);
        expect(result).toHaveLength(5);
        const guids = result.map((n) => n.guid);
        expect(guids).toContain("root");
        expect(guids).toContain("c1");
        expect(guids).toContain("c2");
        expect(guids).toContain("c3");
        expect(guids).toContain("gc1");
    });

    test("preserves root as first element", () => {
        const child = mockTocNode({ guid: "c1", children: [] });
        const root = mockTocNode({ guid: "root", children: [child] });
        const result = flattenToc(root);
        expect(result[0].guid).toBe("root");
    });
});

describe("shuffle", () => {
    test("returns array of same length", () => {
        const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const result = shuffle(arr);
        expect(result).toHaveLength(arr.length);
    });

    test("does not mutate original array", () => {
        const arr = [1, 2, 3, 4, 5];
        const original = [...arr];
        shuffle(arr);
        expect(arr).toEqual(original);
    });

    test("contains all original elements", () => {
        const arr = [10, 20, 30, 40, 50];
        const result = shuffle(arr);
        expect(result.sort((a, b) => a - b)).toEqual(arr.sort((a, b) => a - b));
    });
});

describe("htmlToText", () => {
    test("strips basic HTML tags", () => {
        expect(htmlToText("<p>hello</p>")).toBe("hello");
    });

    test("converts HTML entities", () => {
        expect(htmlToText("&amp; &lt; &gt; &quot; &#39;")).toBe('& < > " \'');
    });

    test("converts &nbsp; to space", () => {
        expect(htmlToText("hello&nbsp;world")).toBe("hello world");
    });

    test("handles paragraph divs with newlines", () => {
        const html = '<div class="para">First</div><div class="para">Second</div>';
        const text = htmlToText(html);
        expect(text).toContain("First");
        expect(text).toContain("Second");
    });

    test("collapses excessive newlines", () => {
        const result = htmlToText("a\n\n\n\n\nb");
        expect(result).toBe("a\n\nb");
    });

    test("trims leading/trailing whitespace", () => {
        expect(htmlToText("  <p> hello </p>  ")).toBe("hello");
    });
});

describe("csvEscape", () => {
    test("returns plain value unchanged", () => {
        expect(csvEscape("hello")).toBe("hello");
    });

    test("wraps value containing comma in quotes", () => {
        expect(csvEscape("a,b")).toBe('"a,b"');
    });

    test("wraps value containing double quote and escapes it", () => {
        expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    });

    test("wraps value containing newline", () => {
        expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
    });

    test("handles empty string", () => {
        expect(csvEscape("")).toBe("");
    });
});

describe("sanitizeFilename", () => {
    test("replaces special characters with underscores", () => {
        expect(sanitizeFilename("hello world!")).toBe("hello_world_");
    });

    test("collapses consecutive underscores", () => {
        expect(sanitizeFilename("a / b / c")).toBe("a_b_c");
    });

    test("preserves allowed characters", () => {
        expect(sanitizeFilename("file-name_01.txt")).toBe("file-name_01.txt");
    });

    test("truncates to 80 characters", () => {
        const long = "a".repeat(100);
        expect(sanitizeFilename(long)).toHaveLength(80);
    });

    test("handles empty string", () => {
        expect(sanitizeFilename("")).toBe("");
    });
});
