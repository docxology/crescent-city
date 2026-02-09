import { describe, expect, test } from "bun:test";
import { paths } from "../src/shared/paths";

describe("paths", () => {
    test("output is defined", () => {
        expect(paths.output).toBe("output");
    });

    test("articles directory is under output", () => {
        expect(paths.articles).toBe("output/articles");
    });

    test("toc path points to toc.json", () => {
        expect(paths.toc).toBe("output/toc.json");
    });

    test("manifest path points to manifest.json", () => {
        expect(paths.manifest).toBe("output/manifest.json");
    });

    test("verificationReport path is correct", () => {
        expect(paths.verificationReport).toBe("output/verification-report.json");
    });

    test("consolidatedJson path is correct", () => {
        expect(paths.consolidatedJson).toBe("output/crescent-city-code.json");
    });

    test("plainText path is correct", () => {
        expect(paths.plainText).toBe("output/crescent-city-code.txt");
    });

    test("sectionIndex path is correct", () => {
        expect(paths.sectionIndex).toBe("output/section-index.csv");
    });

    test("markdown directory is correct", () => {
        expect(paths.markdown).toBe("output/markdown");
    });

    test("article() returns correct path for a GUID", () => {
        expect(paths.article("abc123")).toBe("output/articles/abc123.json");
        expect(paths.article("44236160")).toBe("output/articles/44236160.json");
    });
});
