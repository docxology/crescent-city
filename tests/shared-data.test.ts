import { describe, expect, test } from "bun:test";
import { existsSync } from "fs";
import {
  loadToc,
  loadManifest,
  loadAllArticles,
  loadAllSections,
  loadSection,
  loadMonitorReport,
  searchSections,
  hasScrapedData,
  hasArticles,
} from "../src/shared/data";
import { paths } from "../src/shared/paths";

// Tests run against real output/ if present; otherwise verify graceful fallback.

const hasOutput = existsSync(paths.toc) && existsSync(paths.manifest);

describe("shared/data — core loaders", () => {
  test("loadToc returns a TocNode with expected fields", async () => {
    if (!hasOutput) return;
    const toc = await loadToc();
    expect(toc).toBeDefined();
    expect(toc.guid).toBeDefined();
    expect(toc.tocName).toBeDefined();
    expect(Array.isArray(toc.children)).toBe(true);
    expect(toc.type).toBe("code");
  });

  test("loadToc throws with actionable message when output absent", async () => {
    // Always tests: if output missing, error message is descriptive
    if (hasOutput) return; // skip if data exists
    await expect(loadToc()).rejects.toThrow("Run 'bun run scrape' first");
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

  test("loadAllArticles returns empty array when output dir absent", async () => {
    // The function always returns [] gracefully if dir missing
    if (hasOutput) return;
    const articles = await loadAllArticles();
    expect(articles).toEqual([]);
  });
});

describe("shared/data — loadAllSections", () => {
  test("FlatSection includes history and articleNumber fields", async () => {
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
      expect("history" in first).toBe(true);
      expect("articleNumber" in first).toBe(true);
    }
  });
});

describe("shared/data — loadSection", () => {
  test("returns undefined for unknown guid when output absent", async () => {
    if (hasOutput) return;
    const result = await loadSection("nonexistent-guid");
    expect(result).toBeUndefined();
  });

  test("finds section by guid in real data", async () => {
    if (!hasOutput) return;
    const sections = await loadAllSections();
    if (sections.length === 0) return;
    const target = sections[0];
    const found = await loadSection(target.guid);
    expect(found).toBeDefined();
    expect(found!.guid).toBe(target.guid);
    expect(found!.articleGuid).toBe(target.articleGuid);
  });
});

describe("shared/data — loadMonitorReport", () => {
  test("returns undefined when monitor-report.json does not exist", async () => {
    if (existsSync("output/monitor-report.json")) return;
    const result = await loadMonitorReport();
    expect(result).toBeUndefined();
  });

  test("returns MonitorReport with expected fields if file exists", async () => {
    if (!existsSync("output/monitor-report.json")) return;
    const report = await loadMonitorReport();
    expect(report).toBeDefined();
    expect(typeof report!.timestamp).toBe("string");
    expect(typeof report!.articlesChecked).toBe("number");
    expect(Array.isArray(report!.hashMismatches)).toBe(true);
    expect(["clean", "changed", "error"]).toContain(report!.overallStatus);
  });
});

describe("shared/data — existence checks", () => {
  test("hasScrapedData matches actual file existence", () => {
    const result = hasScrapedData();
    expect(typeof result).toBe("boolean");
    expect(result).toBe(hasOutput);
  });

  test("hasArticles is a function that returns a promise", async () => {
    const result = await hasArticles();
    expect(typeof result).toBe("boolean");
  });
});

describe("shared/data — searchSections", () => {
  test("filters by substring match", async () => {
    if (!hasOutput) return;
    const all = await loadAllSections();
    if (all.length === 0) return;
    const results = await searchSections("the", all);
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(all.length);
  });

  test("returns empty array for nonsense query", async () => {
    if (!hasOutput) return;
    const all = await loadAllSections();
    const results = await searchSections("xyzzy_totally_impossible_query_12345", all);
    expect(results).toHaveLength(0);
  });
});
