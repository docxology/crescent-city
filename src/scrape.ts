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
import type { Page } from "playwright";
import type { TocNode, ScrapeManifest } from "./types.js";

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
  console.log("=== Crescent City Municipal Code Scraper ===\n");

  await mkdir(ARTICLES_DIR, { recursive: true });

  let toc: TocNode;
  let manifest: ScrapeManifest;

  let page = await newPage();

  // Step 1: Fetch TOC
  if (existsSync(paths.toc)) {
    console.log("Loading existing TOC from disk...");
    toc = JSON.parse(await readFile(paths.toc, "utf-8"));
  } else {
    console.log("Fetching table of contents...");
    toc = await fetchToc(page);
    await writeFile(paths.toc, JSON.stringify(toc, null, 2));
    console.log("TOC saved to output/toc.json");
  }

  console.log("\n" + tocSummary(toc) + "\n");

  const articles = getArticlePages(toc);
  const allSections = getSections(toc);

  console.log(`Articles to scrape: ${articles.length}`);
  console.log(`Expected sections: ${allSections.length}\n`);

  // Load existing manifest for resume support
  if (existsSync(paths.manifest)) {
    manifest = JSON.parse(await readFile(paths.manifest, "utf-8"));
    console.log(
      `Resuming: ${Object.keys(manifest.articles).length}/${articles.length} articles already scraped\n`
    );
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
    console.log(`${label} Scraping: ${article.indexNum} ${article.title} (${article.guid})`);

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
      console.log(
        `  -> ${result.sections.length} sections, SHA-256: ${result.sha256.substring(0, 16)}...`
      );

      // Save manifest after each article (for resume)
      await writeFile(paths.manifest, JSON.stringify(manifest, null, 2));
    } catch (err: any) {
      failed++;
      const msg = err.message || String(err);
      failedGuids.push(article.guid);
      console.error(`  -> FAILED: ${msg.split("\n")[0]}`);
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
  }

  // Step 3: Retry failures with fresh page
  if (failedGuids.length > 0) {
    console.log(`\nRetrying ${failedGuids.length} failed articles with fresh page...\n`);

    // Force new page for retries
    try { await page.close(); } catch {}
    page = await newPage();

    for (const guid of failedGuids) {
      const article = articles.find((a) => a.guid === guid);
      if (!article) continue;

      // Skip if it was fixed in a prior retry cycle
      if (manifest.articles[article.guid]) continue;

      console.log(`  Retrying: ${article.indexNum} ${article.title}`);
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
        console.log(`  -> Retry OK: ${result.sections.length} sections`);
        await writeFile(paths.manifest, JSON.stringify(manifest, null, 2));
      } catch (err: any) {
        console.error(`  -> Retry failed: ${err.message?.split("\n")[0]}`);
      }

      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
    }
  }

  // Finalize
  manifest.completedAt = new Date().toISOString();
  await writeFile(paths.manifest, JSON.stringify(manifest, null, 2));

  await closeBrowser();

  // Summary
  console.log("\n=== Scrape Complete ===");
  console.log(`  Scraped: ${scraped}`);
  console.log(`  Skipped (cached): ${skipped}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total articles: ${articles.length}`);
  console.log(`  Expected sections: ${allSections.length}`);
  const totalSections = Object.values(manifest.articles).reduce(
    (sum, a) => sum + a.sectionCount,
    0
  );
  console.log(`  Actual sections scraped: ${totalSections}`);
  console.log(`\nManifest: ${paths.manifest}`);

  if (failed > 0) {
    console.error(`\nWARNING: ${failed} articles failed to scrape.`);
    console.error("Re-run 'bun run scrape' to retry (resume support will skip completed articles).");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  closeBrowser().finally(() => process.exit(1));
});
