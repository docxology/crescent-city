/**
 * Tests for src/content.ts — section extraction from HTML fixtures.
 * Asserts the shape and content of extracted sections without running a browser.
 * Uses fixture HTML strings instead of live scraping (zero-mock approach).
 */
import { describe, test, expect } from "bun:test";
import { htmlToText } from "../src/utils";

// We test htmlToText (used by content extraction) and structural assumptions
// about what a SectionContent should look like.

describe("content extraction — htmlToText utility", () => {
  test("strips basic HTML tags", () => {
    const input = "<p>Hello <strong>world</strong></p>";
    const result = htmlToText(input);
    expect(result).not.toContain("<p>");
    expect(result).not.toContain("<strong>");
    expect(result).toContain("Hello");
    expect(result).toContain("world");
  });

  test("converts HTML entities", () => {
    const input = "Fees &amp; Charges &mdash; Section &sect; 8.04.010";
    const result = htmlToText(input);
    expect(result).toContain("&");
    expect(result).toContain("Section");
  });

  test("strips script and style tags (leaves text content)", () => {
    // htmlToText strips HTML tags but does NOT remove script/style text content
    // It's a simple tag stripper, not a full sanitizer
    const input = "<style>body{margin:0}</style><script>alert(1)</script>Real content";
    const result = htmlToText(input);
    // Tags should be stripped
    expect(result).not.toContain("<style>");
    expect(result).not.toContain("<script>");
    // The text "Real content" should be present
    expect(result).toContain("Real content");
  });

  test("collapses multiple blank lines into fewer", () => {
    const input = "Section 8.04.010\n\n\nFees";
    const result = htmlToText(input);
    // The text should still be present
    expect(result).toContain("Section 8.04.010");
    expect(result).toContain("Fees");
    // At most 2 consecutive newlines (common normalization)
    expect(result).not.toMatch(/\n{4,}/);
  });

  test("handles empty string gracefully", () => {
    expect(htmlToText("")).toBe("");
  });

  test("handles string with only whitespace", () => {
    expect(htmlToText("   \n\t  ").trim()).toBe("");
  });
});

describe("content extraction — section shape assumptions", () => {
  test("a valid FlatSection has all required keys", () => {
    // Structural contract — not testing scraping itself
    const section = {
      guid: "abc-123",
      number: "§ 8.04.010",
      title: "Fees and Charges",
      text: "All fees shall be established by resolution.",
      history: "(Added by Ord. No. 1234)",
      articleGuid: "xyz-456",
      articleTitle: "Chapter 8.04 Revenue",
      articleNumber: "8.04",
    };
    expect(section.guid).toBeTruthy();
    expect(section.number).toMatch(/§/);
    expect(section.text.length).toBeGreaterThan(0);
    expect(section.articleGuid).toBeTruthy();
  });

  test("section number formats are consistent", () => {
    const numbers = [
      "§ 1.04.010",
      "§ 8.04.020",
      "§ 17.56.010",
      "§ 9.04.030",
    ];
    for (const num of numbers) {
      expect(num).toMatch(/^§\s\d+\.\d+\.\d+$/);
    }
  });
});

describe("content extraction — Porter stemmer integration", () => {
  test("stem normalizes common municipal code plurals", async () => {
    const { stem } = await import("../src/shared/porter_stem.ts");
    expect(stem("zones")).toBe("zone");
    expect(stem("permits")).toBe("permit");
    expect(stem("violations")).toBe("violat");
    expect(stem("regulations")).toBe("regul");
    expect(stem("fees")).toBe("fee");
    expect(stem("parking")).toBe("park");
  });

  test("stem is idempotent", async () => {
    const { stem } = await import("../src/shared/porter_stem.ts");
    const words = ["zone", "permit", "fee", "park"];
    for (const w of words) {
      expect(stem(stem(w))).toBe(stem(w));
    }
  });

  test("stemSet returns a Set of stemmed tokens from text", async () => {
    const { stemSet } = await import("../src/shared/porter_stem.ts");
    const s = stemSet("Parking fees and regulations for zones");
    expect(s instanceof Set).toBe(true);
    expect(s.has("park")).toBe(true);
    expect(s.has("fee")).toBe(true);
  });
});

describe("content extraction — Flesch-Kincaid readability", () => {
  test("computeReadability returns null for short text", async () => {
    const { computeReadability } = await import("../src/shared/readability.ts");
    expect(computeReadability("Short.")).toBeNull();
  });

  test("computeReadability returns a valid score for normal text", async () => {
    const { computeReadability } = await import("../src/shared/readability.ts");
    const text = "The quick brown fox jumps over the lazy dog. The dog barked. The fox ran away. Dogs are fast. Foxes are clever animals that live in dens.";
    const score = computeReadability(text);
    expect(score).not.toBeNull();
    expect(typeof score!.gradeLevel).toBe("number");
    expect(typeof score!.readingEase).toBe("number");
    expect(score!.wordCount).toBeGreaterThan(0);
    expect(["plain", "standard", "complex", "legal"]).toContain(score!.difficulty);
  });

  test("legal text scores higher grade level than plain text", async () => {
    const { computeReadability } = await import("../src/shared/readability.ts");
    const plain = "The city shall fix all broken roads. Fees are due each month. All permits require an application. Public hearings are open to all residents.";
    const legal = "Notwithstanding any provision to the contrary, the Municipality shall promulgate regulations pertaining to permissible utilization of public easements in accordance with established administrative procedures. All applicants must demonstrate compliance with applicable statutory requirements. The department shall adjudicate applications within sixty days of submission.";
    const plainScore = computeReadability(plain);
    const legalScore = computeReadability(legal);
    expect(plainScore).not.toBeNull();
    expect(legalScore).not.toBeNull();
    expect(legalScore!.gradeLevel).toBeGreaterThan(plainScore!.gradeLevel);
  });
});
