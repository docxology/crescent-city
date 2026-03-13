#!/usr/bin/env bun
/**
 * Main scraper entry point.
 *
 * Workflow:
 *   1. Fetch the full table of contents from ecode360 API
 *   2. Identify all article (chapter) pages that contain section text
 *   3. Navigate to each article page and extract content
 *   4. Save raw HTML, parsed sections, and a manifest for verification
 *
 * Output:
 *   output/toc.json           - Full table of contents tree
 *   output/manifest.json      - Scrape manifest with hashes
 *   output/articles/{guid}.json - Per-article content files
 */
import { mkdir, writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import { newPage, closeBrowser } from "./browser.js";
import { fetchToc, getArticlePages, getSections, tocSummary } from "./toc.js";
import { scrapeArticlePage } from "./content.js";
import { ARTICLES_DIR, RATE_LIMIT_MS, BASE_URL, MUNICIPALITY_CODE } from "./constants.js";
import { flattenToc } from "./utils.js";
import { paths } from "./shared/paths.js";
import { createLogger } from "./logger.js";
import type { Page } from "playwright";
import type { TocNode, ScrapeManifest } from "./types.js";

const log = createLogger("scraper");

/** Get or recreate a working page */
async function ensurePage(currentPage: Page | null): Promise<Page> {
  if (currentPage) {
    try {
      // Test if page is still alive
      await currentPage.evaluate(() => true);
      return currentPage;
    } catch {
      // Page is dead, create new one
    }
  }
  return await newPage();
}

async function main() {
  log.info("=== Crescent City Municipal Code Scraper ===");

  await mkdir(ARTICLES_DIR, { recursive: true });

  let toc: TocNode;
  let manifest: ScrapeManifest;

  let page = await newPage();

  // Step 1: Fetch TOC
  if (existsSync(paths.toc)) {
    log.info("Loading existing TOC from disk...");
    toc = JSON.parse(await readFile(paths.toc, "utf-8"));
  } else {
    log.info("Fetching table of contents...");
    toc = await fetchToc(page);
    await writeFile(paths.toc, JSON.stringify(toc, null, 2));
    log.info("TOC saved to output/toc.json");
  }

  log.info(tocSummary(toc));

  const articles = getArticlePages(toc);
  const allSections = getSections(toc);

  log.info(`Articles to scrape: ${articles.length}`);
  log.info(`Expected sections: ${allSections.length}`);

  // Load existing manifest for resume support
  if (existsSync(paths.manifest)) {
    manifest = JSON.parse(await readFile(paths.manifest, "utf-8"));
    log.info(`Resuming: ${Object.keys(manifest.articles).length}/${articles.length} articles already scraped`);
  } else {
    manifest = {
      municipality: toc.tocName,
      municipalityGuid: toc.guid,
      sourceUrl: `${BASE_URL}/${MUNICIPALITY_CODE}`,
      version: "",
      scrapedAt: new Date().toISOString(),
      completedAt: "",
      tocNodeCount: flattenToc(toc).length,
      articlePageCount: articles.length,
      sectionCount: allSections.length,
      articles: {},
    };
  }

  // Step 2: Scrape each article page
  let scraped = 0;
  let skipped = 0;
  let failed = 0;
  const failedGuids: string[] = [];

  for (const article of articles) {
    // Skip if already scraped
    if (manifest.articles[article.guid]) {
      const filePath = paths.article(article.guid);
      if (existsSync(filePath)) {
        skipped++;
        continue;
      }
    }

    const idx = scraped + skipped + failed + 1;
    const label = `[${idx}/${articles.length}]`;
    log.info(`[${idx}/${articles.length}] Scraping: ${article.indexNum} ${article.title}`, { guid: article.guid });

    try {
      page = await ensurePage(page);
      const result = await scrapeArticlePage(page, article);

      // Save article content
      const filePath = paths.article(article.guid);
      await writeFile(filePath, JSON.stringify(result, null, 2));

      // Update manifest
      manifest.articles[article.guid] = {
        guid: article.guid,
        title: article.title,
        number: article.number,
        sectionCount: result.sections.length,
        sha256: result.sha256,
        filePath: `articles/${article.guid}.json`,
      };

      scraped++;
      log.info(`  -> ${result.sections.length} sections, SHA-256: ${result.sha256.substring(0, 16)}...`);

      // Save manifest after each article (for resume)
      await writeFile(paths.manifest, JSON.stringify(manifest, null, 2));
    } catch (err: any) {
      failed++;
      const msg = err.message || String(err);
      failedGuids.push(article.guid);
      log.error(`FAILED: ${msg.split("\n")[0]}`, { guid: article.guid });
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
  }

  // Step 3: Retry failures with fresh page
  if (failedGuids.length > 0) {
    log.info(`Retrying ${failedGuids.length} failed articles with fresh page...`);

    // Force new page for retries
    try { await page.close(); } catch {}
    page = await newPage();

    for (const guid of failedGuids) {
      const article = articles.find((a) => a.guid === guid);
      if (!article) continue;

      // Skip if it was fixed in a prior retry cycle
      if (manifest.articles[article.guid]) continue;

      log.info(`Retrying: ${article.indexNum} ${article.title}`);
      try {
        page = await ensurePage(page);
        const result = await scrapeArticlePage(page, article);
        const filePath = paths.article(article.guid);
        await writeFile(filePath, JSON.stringify(result, null, 2));

        manifest.articles[article.guid] = {
          guid: article.guid,
          title: article.title,
          number: article.number,
          sectionCount: result.sections.length,
          sha256: result.sha256,
          filePath: `articles/${article.guid}.json`,
        };

        scraped++;
        failed--;
        log.info(`Retry OK: ${result.sections.length} sections`, { guid: article.guid });
        await writeFile(paths.manifest, JSON.stringify(manifest, null, 2));
      } catch (err: any) {
        log.error(`Retry failed`, { guid: article.guid, error: err.message?.split("\n")[0] });
      }

      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
    }
  }

  // Finalize
  manifest.completedAt = new Date().toISOString();
  await writeFile(paths.manifest, JSON.stringify(manifest, null, 2));

  await closeBrowser();

  // Summary
  log.info("=== Scrape Complete ===");
  log.info(`  Scraped: ${scraped}`);
  log.info(`  Skipped (cached): ${skipped}`);
  log.info(`  Failed: ${failed}`);
  log.info(`  Total articles: ${articles.length}`);
  log.info(`  Expected sections: ${allSections.length}`);
  const totalSections = Object.values(manifest.articles).reduce(
    (sum, a) => sum + a.sectionCount,
    0
  );
  log.info(`  Actual sections scraped: ${totalSections}`);
  log.info(`Manifest: ${paths.manifest}`);

  if (failed > 0) {
    log.error(`WARNING: ${failed} articles failed to scrape.`);
    log.error("Re-run 'bun run scrape' to retry (resume support will skip completed articles).");
    process.exit(1);
  }
}

main().catch((err) => {
  log.error("Fatal error", { error: String(err) });
  closeBrowser().finally(() => process.exit(1));
});
