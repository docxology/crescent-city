/**
 * Tests for src/verify.ts — verification logic, hash checking, section coverage.
 * These test the exported pure functions and structural contracts.
 * No live network calls; no scraping required.
 */
import { describe, test, expect } from "bun:test";
import { existsSync } from "fs";
import { paths } from "../src/shared/paths";
import { computeSha256 } from "../src/utils";

describe("verify — computeSha256 utility", () => {
  test("returns a 64-char hex string for non-empty input", async () => {
    const hash = await computeSha256("hello world");
    expect(typeof hash).toBe("string");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  test("returns a stable hash for the same input", async () => {
    const a = await computeSha256("Crescent City Municipal Code");
    const b = await computeSha256("Crescent City Municipal Code");
    expect(a).toBe(b);
  });

  test("returns different hashes for different inputs", async () => {
    const a = await computeSha256("hello");
    const b = await computeSha256("world");
    expect(a).not.toBe(b);
  });

  test("handles empty string", async () => {
    const hash = await computeSha256("");
    expect(hash).toHaveLength(64);
  });

  test("is sensitive to whitespace differences", async () => {
    const a = await computeSha256("section 8.04.010");
    const b = await computeSha256("section 8.04.010 ");
    expect(a).not.toBe(b);
  });
});

describe("verify — verification report structure", () => {
  test("verification report has expected shape when loadable", async () => {
    const reportPath = "output/verification-report.json";
    if (!existsSync(reportPath)) {
      // No output yet — skip structural test
      return;
    }
    const { readFile } = await import("fs/promises");
    const raw = await readFile(reportPath, "utf-8");
    const report = JSON.parse(raw);
    // Structure check
    expect(typeof report.verifiedAt).toBe("string");
    expect(typeof report.articlesChecked).toBe("number");
    expect(Array.isArray(report.hashMismatches)).toBe(true);
    expect(Array.isArray(report.missingSections)).toBe(true);
    expect(typeof report.overallStatus).toBe("string");
  });
});

describe("verify — manifest structure when present", () => {
  test("manifest has expected fields when scraped data exists", async () => {
    if (!existsSync(paths.manifest)) return;
    const { loadManifest } = await import("../src/shared/data");
    const manifest = await loadManifest();
    expect(typeof manifest.municipality).toBe("string");
    expect(typeof manifest.sectionCount).toBe("number");
    expect(manifest.sectionCount).toBeGreaterThan(0);
    expect(typeof manifest.tocNodeCount).toBe("number");
    expect(typeof manifest.articles).toBe("object");
    expect(Object.keys(manifest.articles).length).toBeGreaterThan(0);
  });

  test("each manifest article entry has guid, title, sha256", async () => {
    if (!existsSync(paths.manifest)) return;
    const { loadManifest } = await import("../src/shared/data");
    const manifest = await loadManifest();
    for (const entry of Object.values(manifest.articles)) {
      expect(typeof (entry as any).guid).toBe("string");
      expect(typeof (entry as any).title).toBe("string");
      expect(typeof (entry as any).sha256).toBe("string");
      expect((entry as any).sha256).toHaveLength(64);
    }
  });
});

describe("verify — data module TTL cache", () => {
  test("invalidateSectionsCache is exported and callable", async () => {
    const { invalidateSectionsCache } = await import("../src/shared/data");
    expect(() => invalidateSectionsCache()).not.toThrow();
  });

  test("loadAllSectionsCount returns a number", async () => {
    const { loadAllSectionsCount } = await import("../src/shared/data");
    const count = await loadAllSectionsCount();
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("loadAllSections returns an array", async () => {
    const { loadAllSections } = await import("../src/shared/data");
    const sections = await loadAllSections();
    expect(Array.isArray(sections)).toBe(true);
  });
});

describe("verify — domain coverage module", () => {
  test("computeDomainCoverage is importable", async () => {
    const mod = await import("../src/domains/coverage.ts");
    expect(typeof mod.computeDomainCoverage).toBe("function");
  });

  test("domain coverage report has expected fields without scraped data", async () => {
    const { computeDomainCoverage } = await import("../src/domains/coverage.ts");
    // No scraped data → should still return a valid (empty) report
    const report = await computeDomainCoverage();
    expect(typeof report.computedAt).toBe("string");
    expect(typeof report.totalSections).toBe("number");
    expect(typeof report.overallCoveragePct).toBe("number");
    expect(Array.isArray(report.domains)).toBe(true);
    expect(report.domains.length).toBe(9); // 9 intelligence domains
  });
});
