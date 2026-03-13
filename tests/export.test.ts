import { describe, expect, test } from "bun:test";
import { csvEscape, htmlToText, sanitizeFilename } from "../src/utils";

describe("Export formatting", () => {
    describe("CSV generation", () => {
        test("generates correct CSV row for simple values", () => {
            const fields = ["guid1", "§ 1.04.010", "General Provisions", "art1", "1.04", "Article Title", "Added 2020"];
            const row = fields.map(csvEscape).join(",");
            expect(row).toContain("guid1");
            expect(row).toContain("General Provisions");
        });

        test("escapes fields with commas correctly", () => {
            const row = [csvEscape("guid"), csvEscape("value, with comma")].join(",");
            expect(row).toBe('guid,"value, with comma"');
        });

        test("escapes fields with newlines for CSV safety", () => {
            const escaped = csvEscape("line1\nline2");
            expect(escaped).toBe('"line1\nline2"');
        });

        test("escapes fields with quotes", () => {
            const escaped = csvEscape('say "hello"');
            expect(escaped).toBe('"say ""hello"""');
        });
    });

    describe("Markdown formatting", () => {
        test("htmlToText converts section HTML to readable text", () => {
            const html = '<div class="para">First paragraph</div><div class="para">Second paragraph</div>';
            const text = htmlToText(html);
            expect(text).toContain("First paragraph");
            expect(text).toContain("Second paragraph");
        });

        test("htmlToText handles history div", () => {
            const html = '<div class="history">Added by Ord. 123</div>';
            const text = htmlToText(html);
            expect(text).toContain("History:");
            expect(text).toContain("Added by Ord. 123");
        });

        test("htmlToText decodes all HTML entities", () => {
            const html = "§&nbsp;1.04 &amp; &lt;provisions&gt;";
            const text = htmlToText(html);
            expect(text).toContain("§ 1.04 & <provisions>");
        });
    });

    describe("Filename sanitization for exports", () => {
        test("sanitizes chapter number for filename", () => {
            const name = sanitizeFilename("Chapter 1.04");
            expect(name).toBe("Chapter_1.04");
        });

        test("handles complex titles", () => {
            const name = sanitizeFilename("Title 17: Zoning & Land-Use (2024)");
            expect(name).toMatch(/^[a-zA-Z0-9._-]+$/);
            expect(name.length).toBeLessThanOrEqual(80);
        });

        test("produces unique names for different inputs", () => {
            const a = sanitizeFilename("Chapter 1.04: General");
            const b = sanitizeFilename("Chapter 2.08: Administration");
            expect(a).not.toBe(b);
        });
    });
});
