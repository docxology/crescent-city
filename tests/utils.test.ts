import { describe, expect, test } from "bun:test";
import {
  computeSha256,
  flattenToc,
  shuffle,
  chunk,
  groupBy,
  uniqBy,
  htmlToText,
  truncateText,
  countWords,
  extractSnippet,
  formatBytes,
  csvEscape,
  sanitizeFilename,
  sleep,
  withRetry,
  deepEqual,
  pick,
  omit,
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

// ─── computeSha256 ───────────────────────────────────────────────

describe("computeSha256", () => {
  test("returns 64-char hex string for empty string", async () => {
    const hash = await computeSha256("");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
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

// ─── flattenToc ──────────────────────────────────────────────────

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

// ─── shuffle ─────────────────────────────────────────────────────

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

// ─── chunk ───────────────────────────────────────────────────────

describe("chunk", () => {
  test("splits evenly into chunks", () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
  });

  test("last chunk may be smaller", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  test("size larger than array returns single chunk", () => {
    expect(chunk([1, 2, 3], 10)).toEqual([[1, 2, 3]]);
  });

  test("empty array returns empty array", () => {
    expect(chunk([], 3)).toEqual([]);
  });
});

// ─── groupBy ─────────────────────────────────────────────────────

describe("groupBy", () => {
  test("groups by key correctly", () => {
    const items = [{ type: "a" }, { type: "b" }, { type: "a" }];
    const result = groupBy(items, (x) => x.type);
    expect(result["a"]).toHaveLength(2);
    expect(result["b"]).toHaveLength(1);
  });

  test("empty array returns empty object", () => {
    expect(groupBy([], (x: any) => x)).toEqual({});
  });
});

// ─── uniqBy ──────────────────────────────────────────────────────

describe("uniqBy", () => {
  test("removes duplicates by key", () => {
    const items = [{ id: "a", v: 1 }, { id: "b", v: 2 }, { id: "a", v: 3 }];
    const result = uniqBy(items, (x) => x.id);
    expect(result).toHaveLength(2);
    expect(result[0].v).toBe(1); // first occurrence kept
  });

  test("empty array stays empty", () => {
    expect(uniqBy([], (x: any) => x)).toEqual([]);
  });
});

// ─── htmlToText ──────────────────────────────────────────────────

describe("htmlToText", () => {
  test("strips basic HTML tags", () => {
    expect(htmlToText("<p>hello</p>")).toBe("hello");
  });

  test("converts HTML entities", () => {
    expect(htmlToText("&amp; &lt; &gt; &quot; &#39;")).toBe("& < > \" '");
  });

  test("converts numeric HTML entities", () => {
    expect(htmlToText("&#65;")).toBe("A");
  });

  test("converts &nbsp; to space", () => {
    expect(htmlToText("hello&nbsp;world")).toBe("hello world");
  });

  test("collapses excessive newlines", () => {
    const result = htmlToText("a\n\n\n\n\nb");
    expect(result).toBe("a\n\nb");
  });

  test("trims leading/trailing whitespace", () => {
    expect(htmlToText("  <p> hello </p>  ")).toBe("hello");
  });
});

// ─── truncateText ────────────────────────────────────────────────

describe("truncateText", () => {
  test("returns text unchanged if within limit", () => {
    expect(truncateText("hello world", 20)).toBe("hello world");
  });

  test("appends ellipsis when truncated", () => {
    const result = truncateText("hello world foo bar", 10);
    expect(result).toContain("…");
  });

  test("truncated result length is not more than maxLength + 1 for ellipsis", () => {
    const result = truncateText("hello world foo bar baz qux", 15);
    expect(result.length).toBeLessThanOrEqual(16);
  });

  test("handles empty string", () => {
    expect(truncateText("", 10)).toBe("");
  });
});

// ─── countWords ──────────────────────────────────────────────────

describe("countWords", () => {
  test("counts single word", () => {
    expect(countWords("hello")).toBe(1);
  });

  test("counts multiple words", () => {
    expect(countWords("the quick brown fox")).toBe(4);
  });

  test("returns 0 for empty string", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
  });

  test("handles multiple spaces", () => {
    expect(countWords("a  b  c")).toBe(3);
  });
});

// ─── extractSnippet ──────────────────────────────────────────────

describe("extractSnippet", () => {
  test("returns snippet containing query", () => {
    const text = "The quick brown fox jumps over the lazy dog";
    const snippet = extractSnippet(text, "fox");
    expect(snippet).toContain("fox");
  });

  test("returns truncated text when query not found", () => {
    const text = "a".repeat(300);
    const snippet = extractSnippet(text, "notfound");
    expect(snippet.length).toBeLessThanOrEqual(202);
  });
});

// ─── formatBytes ─────────────────────────────────────────────────

describe("formatBytes", () => {
  test("formats bytes under 1024", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  test("formats kilobytes", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  test("formats megabytes", () => {
    expect(formatBytes(2 * 1024 * 1024)).toBe("2.0 MB");
  });

  test("formats 0 bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });
});

// ─── csvEscape ───────────────────────────────────────────────────

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

// ─── sanitizeFilename ────────────────────────────────────────────

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

// ─── sleep ───────────────────────────────────────────────────────

describe("sleep", () => {
  test("resolves after approximately the given ms", async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });

  test("sleep(0) resolves immediately", async () => {
    await expect(sleep(0)).resolves.toBeUndefined();
  });
});

// ─── withRetry ───────────────────────────────────────────────────

describe("withRetry", () => {
  test("returns result on first success", async () => {
    const result = await withRetry(async () => 42);
    expect(result).toBe(42);
  });

  test("retries on failure and eventually succeeds", async () => {
    let attempts = 0;
    const result = await withRetry(async () => {
      attempts++;
      if (attempts < 3) throw new Error("not yet");
      return "done";
    }, 3, 1);
    expect(result).toBe("done");
    expect(attempts).toBe(3);
  });

  test("throws after max attempts", async () => {
    let attempts = 0;
    await expect(
      withRetry(async () => {
        attempts++;
        throw new Error("always fails");
      }, 2, 1)
    ).rejects.toThrow("always fails");
    expect(attempts).toBe(2);
  });
});

// ─── deepEqual ───────────────────────────────────────────────────

describe("deepEqual", () => {
  test("primitives equal", () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual("a", "a")).toBe(true);
  });

  test("primitives not equal", () => {
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual("a", "b")).toBe(false);
  });

  test("shallow objects equal", () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
  });

  test("nested objects equal", () => {
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
  });

  test("different structure not equal", () => {
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  test("null equals null", () => {
    expect(deepEqual(null, null)).toBe(true);
  });
});

// ─── pick ────────────────────────────────────────────────────────

describe("pick", () => {
  test("picks specified keys", () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(pick(obj, ["a", "c"])).toEqual({ a: 1, c: 3 });
  });

  test("empty keys returns empty object", () => {
    expect(pick({ a: 1 }, [])).toEqual({});
  });
});

// ─── omit ────────────────────────────────────────────────────────

describe("omit", () => {
  test("omits specified keys", () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(omit(obj, ["b"])).toEqual({ a: 1, c: 3 });
  });

  test("empty keys returns original object copy", () => {
    const obj = { a: 1, b: 2 };
    expect(omit(obj, [])).toEqual(obj);
  });
});
