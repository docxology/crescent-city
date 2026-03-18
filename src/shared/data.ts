/** Shared data loading layer for reading scraped output */
import { readFile, readdir } from "fs/promises";
import { existsSync } from "fs";
import type {
  TocNode,
  ScrapeManifest,
  ArticlePage,
  FlatSection,
  MonitorReport,
} from "../types.js";
import { paths } from "./paths.js";

// ─── In-process TTL cache ─────────────────────────────────────────

/** Cache entry for all sections (60 second TTL) */
let _sectionsCache: FlatSection[] | null = null;
let _sectionsCacheTs = 0;
const SECTIONS_CACHE_TTL_MS = 60_000; // 60 seconds

/** Invalidate the sections cache (call after re-scrape or export). */
export function invalidateSectionsCache(): void {
  _sectionsCache = null;
  _sectionsCacheTs = 0;
}

// ─── Core loaders ────────────────────────────────────────────────

/** Load the TOC tree from output/toc.json */
export async function loadToc(): Promise<TocNode> {
  try {
    const raw = await readFile(paths.toc, "utf-8");
    return JSON.parse(raw) as TocNode;
  } catch (err: any) {
    throw new Error(`Failed to load TOC from ${paths.toc}: ${err.message}. Run 'bun run scrape' first.`);
  }
}

/** Load the scrape manifest from output/manifest.json */
export async function loadManifest(): Promise<ScrapeManifest> {
  try {
    const raw = await readFile(paths.manifest, "utf-8");
    return JSON.parse(raw) as ScrapeManifest;
  } catch (err: any) {
    throw new Error(`Failed to load manifest from ${paths.manifest}: ${err.message}. Run 'bun run scrape' first.`);
  }
}

/** Load a single article by GUID */
export async function loadArticle(guid: string): Promise<ArticlePage> {
  const articlePath = paths.article(guid);
  try {
    const raw = await readFile(articlePath, "utf-8");
    return JSON.parse(raw) as ArticlePage;
  } catch (err: any) {
    throw new Error(`Failed to load article '${guid}' from ${articlePath}: ${err.message}`);
  }
}

/** Load all article files from the articles directory (in parallel) */
export async function loadAllArticles(): Promise<ArticlePage[]> {
  const dir = paths.articles;
  if (!existsSync(dir)) return [];
  const files = await readdir(dir);
  const jsonFiles = files.filter(f => f.endsWith(".json"));
  // Load all articles in parallel for speed
  const articles = await Promise.allSettled(
    jsonFiles.map(f => readFile(`${dir}/${f}`, "utf-8").then(raw => JSON.parse(raw) as ArticlePage))
  );
  const result: ArticlePage[] = [];
  for (const outcome of articles) {
    if (outcome.status === "fulfilled") {
      result.push(outcome.value);
    }
  }
  return result;
}

/** Load all sections as a flat array with article metadata attached.
 * Cached in-process for 60 seconds to avoid redundant disk reads. */
export async function loadAllSections(): Promise<FlatSection[]> {
  const now = Date.now();
  if (_sectionsCache && now - _sectionsCacheTs < SECTIONS_CACHE_TTL_MS) {
    return _sectionsCache;
  }
  const articles = await loadAllArticles();
  const sections: FlatSection[] = [];
  for (const article of articles) {
    for (const s of article.sections) {
      sections.push({
        guid: s.guid,
        number: s.number,
        title: s.title,
        text: s.text,
        history: s.history,
        articleGuid: article.guid,
        articleTitle: article.title,
        articleNumber: article.number,
      });
    }
  }
  _sectionsCache = sections;
  _sectionsCacheTs = now;
  return sections;
}

/** Return just the count of all sections without loading text bodies.
 * Uses the cache if warm, otherwise counts file-by-file. */
export async function loadAllSectionsCount(): Promise<number> {
  if (_sectionsCache && Date.now() - _sectionsCacheTs < SECTIONS_CACHE_TTL_MS) {
    return _sectionsCache.length;
  }
  const articles = await loadAllArticles();
  return articles.reduce((n, a) => n + a.sections.length, 0);
}

/**
 * Load a single section by GUID across all articles.
 * Searches the articles directory and returns the section with its parent article context.
 * Returns undefined if not found.
 */
export async function loadSection(guid: string): Promise<FlatSection | undefined> {
  const dir = paths.articles;
  if (!existsSync(dir)) return undefined;
  const files = await readdir(dir);

  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    try {
      const article: ArticlePage = JSON.parse(await readFile(`${dir}/${f}`, "utf-8"));
      const section = article.sections.find(s => s.guid === guid);
      if (section) {
        return {
          guid: section.guid,
          number: section.number,
          title: section.title,
          text: section.text,
          history: section.history,
          articleGuid: article.guid,
          articleTitle: article.title,
          articleNumber: article.number,
        };
      }
    } catch {
      // Skip malformed files
    }
  }
  return undefined;
}

// ─── Search ──────────────────────────────────────────────────────

/** Simple substring search across all sections (number, title, text) */
export async function searchSections(
  query: string,
  sections?: FlatSection[]
): Promise<FlatSection[]> {
  const all = sections ?? (await loadAllSections());
  const lower = query.toLowerCase();
  return all.filter(
    (s) =>
      s.number.toLowerCase().includes(lower) ||
      s.title.toLowerCase().includes(lower) ||
      s.text.toLowerCase().includes(lower)
  );
}

// ─── Monitoring data ─────────────────────────────────────────────

/**
 * Load the latest monitor report from output/monitor-report.json.
 * Returns undefined if the file does not exist (monitor has never been run).
 */
export async function loadMonitorReport(): Promise<MonitorReport | undefined> {
  const reportPath = `${paths.output}/monitor-report.json`;
  if (!existsSync(reportPath)) return undefined;
  try {
    const raw = await readFile(reportPath, "utf-8");
    return JSON.parse(raw) as MonitorReport;
  } catch (err: any) {
    throw new Error(`Failed to load monitor report: ${err.message}`);
  }
}

// ─── Existence checks ────────────────────────────────────────────

/** Returns true if scraped data exists (toc.json + manifest.json) */
export function hasScrapedData(): boolean {
  return existsSync(paths.toc) && existsSync(paths.manifest);
}

/** Returns true if the articles directory exists and is non-empty */
export async function hasArticles(): Promise<boolean> {
  if (!existsSync(paths.articles)) return false;
  const files = await readdir(paths.articles);
  return files.some(f => f.endsWith(".json"));
}
