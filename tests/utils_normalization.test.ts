/**
 * Tests for normalizeText() and checkSectionLengthOutliers() in utils.ts.
 * Zero-mock — calls real functions directly.
 */
import { describe, test, expect } from "bun:test";
import { normalizeText, checkSectionLengthOutliers } from "../src/utils.ts";

describe("normalizeText", () => {
  test("replaces left and right single smart quotes with straight apostrophe", () => {
    expect(normalizeText("\u2018hello\u2019")).toBe("'hello'");
    expect(normalizeText("\u201B world \u2032")).toBe("' world '");
  });

  test("replaces left and right double smart quotes with straight quotes", () => {
    expect(normalizeText("\u201Chello\u201D")).toBe('"hello"');
    expect(normalizeText("\u201Etest\u201F")).toBe('"test"');
  });

  test("replaces em dash with hyphen-minus", () => {
    expect(normalizeText("foo\u2014bar")).toBe("foo-bar");
    expect(normalizeText("a\u2013b")).toBe("a-b"); // en dash
    expect(normalizeText("x\u2212y")).toBe("x-y"); // minus sign
  });

  test("replaces non-breaking space with regular space", () => {
    expect(normalizeText("hello\u00A0world")).toBe("hello world");
    expect(normalizeText("a\u202Fb")).toBe("a b");
  });

  test("replaces ellipsis with three periods", () => {
    expect(normalizeText("see\u2026more")).toBe("see...more");
  });

  test("replaces ligatures with plain letters", () => {
    expect(normalizeText("\uFB01sh")).toBe("fish");  // fi ligature
    expect(normalizeText("\uFB02ag")).toBe("flag");  // fl ligature
    expect(normalizeText("\uFB00ed")).toBe("ffed");  // ff ligature
  });

  test("collapses multiple spaces", () => {
    expect(normalizeText("foo    bar")).toBe("foo bar");
  });

  test("preserves section sign §", () => {
    expect(normalizeText("§ 8.04.010")).toBe("§ 8.04.010");
  });

  test("is idempotent", () => {
    const input = "The \u201Charbor\u201D\u2014a \u2018port\u2019";
    const once = normalizeText(input);
    const twice = normalizeText(once);
    expect(once).toBe(twice);
  });

  test("handles empty string", () => {
    expect(normalizeText("")).toBe("");
  });

  test("handles plain ASCII unchanged", () => {
    const plain = "The quick brown fox jumps over the lazy dog.";
    expect(normalizeText(plain)).toBe(plain);
  });
});

describe("checkSectionLengthOutliers", () => {
  const sections = [
    { guid: "a", number: "§ 1.01.010", title: "Short", text: "Yes." },
    { guid: "b", number: "§ 2.02.020", title: "Normal", text: "word ".repeat(100).trim() },
    { guid: "c", number: "§ 3.03.030", title: "Very long", text: "word ".repeat(6000).trim() },
  ];

  test("flags section with <25 words as too_short", () => {
    const out = checkSectionLengthOutliers(sections);
    const short = out.find(o => o.guid === "a");
    expect(short).toBeDefined();
    expect(short!.reason).toBe("too_short");
  });

  test("flags section with >5000 words as too_long", () => {
    const out = checkSectionLengthOutliers(sections);
    const long = out.find(o => o.guid === "c");
    expect(long).toBeDefined();
    expect(long!.reason).toBe("too_long");
  });

  test("does not flag normal-length section", () => {
    const out = checkSectionLengthOutliers(sections);
    expect(out.find(o => o.guid === "b")).toBeUndefined();
  });

  test("returns sorted ascending by wordCount", () => {
    const out = checkSectionLengthOutliers(sections);
    for (let i = 1; i < out.length; i++) {
      expect(out[i].wordCount).toBeGreaterThanOrEqual(out[i - 1].wordCount);
    }
  });

  test("returns empty array for empty input", () => {
    expect(checkSectionLengthOutliers([])).toEqual([]);
  });

  test("respects custom minWords/maxWords thresholds", () => {
    const out = checkSectionLengthOutliers(sections, 50, 200);
    // 100-word section is now too_short (<50 is fine, but 100 > 50). Wait—
    // short (1 word) < 50 → too_short
    // normal (100 words) is within [50, 200] → not flagged
    // long (6000 words) > 200 → too_long
    const short = out.find(o => o.guid === "a");
    const long = out.find(o => o.guid === "c");
    expect(short?.reason).toBe("too_short");
    expect(long?.reason).toBe("too_long");
  });
});
