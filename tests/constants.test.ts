import { describe, expect, test } from "bun:test";
import {
    BASE_URL,
    MUNICIPALITY_CODE,
    OUTPUT_DIR,
    ARTICLES_DIR,
    RATE_LIMIT_MS,
} from "../src/constants";

describe("constants", () => {
    test("BASE_URL is an ecode360 URL", () => {
        expect(BASE_URL).toBe("https://ecode360.com");
        expect(BASE_URL).toMatch(/^https:\/\//);
    });

    test("MUNICIPALITY_CODE is CR4919", () => {
        expect(MUNICIPALITY_CODE).toBe("CR4919");
    });

    test("OUTPUT_DIR is 'output'", () => {
        expect(OUTPUT_DIR).toBe("output");
    });

    test("ARTICLES_DIR is under OUTPUT_DIR", () => {
        expect(ARTICLES_DIR).toBe("output/articles");
        expect(ARTICLES_DIR.startsWith(OUTPUT_DIR)).toBe(true);
    });

    test("RATE_LIMIT_MS is a positive number", () => {
        expect(typeof RATE_LIMIT_MS).toBe("number");
        expect(RATE_LIMIT_MS).toBeGreaterThan(0);
        expect(RATE_LIMIT_MS).toBe(2000);
    });
});
