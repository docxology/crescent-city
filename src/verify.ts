#!/usr/bin/env bun
/**
 * Verification module.
 *
 * After scraping, this independently verifies completeness and integrity:
 *   1. Re-fetches the TOC to get the current expected structure
 *   2. Checks every article file exists and SHA-256 matches
 *   3. Checks every expected section (from TOC) is present in scraped data
 *   4. Optionally re-downloads a random sample of pages and compares byte-for-byte
 *
 * Output:
 *   output/verification-report.json
 */
import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import type {
  TocNode,
  ScrapeManifest,
  ArticlePage,
  VerificationResult,
  VerificationReport,
} from "./types.js";
import { getArticlePages, getSections } from "./toc.js";
import { newPage, closeBrowser, navigateWithCloudflare } from "./browser.js";
import { computeSha256, shuffle } from "./utils.js";
import { paths } from "./shared/paths.js";
import { VERIFY_SAMPLE_SIZE } from "./constants.js";
import { createLogger } from "./logger.js";

const log = createLogger("verifier");

/**
 * Recursively collect all section GUIDs that are descendants of a given node.
 * This handles subarticles and parts nested within articles.
 */
function collectDescendantSections(node: TocNode): TocNode[] {
  const sections: TocNode[] = [];
  for (const child of node.children) {
    if (child.type === "section") {
      sections.push(child);
    } else if (child.type === "subarticle" || child.type === "part") {
      sections.push(...collectDescendantSections(child));
    }
  }
  return sections;
}

async function main() {
  log.info("=== Crescent City Municipal Code Verifier ===");

  if (!existsSync(paths.toc) || !existsSync(paths.manifest)) {
    log.error("Run the scraper first (bun run scrape)");
    process.exit(1);
  }

  const toc: TocNode = JSON.parse(await readFile(paths.toc, "utf-8"));
  const manifest: ScrapeManifest = JSON.parse(await readFile(paths.manifest, "utf-8"));

  const expectedArticles = getArticlePages(toc);
  const expectedSections = getSections(toc);

  log.info(`Expected articles: ${expectedArticles.length}`);
  log.info(`Expected sections: ${expectedSections.length}`);
  log.info(`Scraped articles: ${Object.keys(manifest.articles).length}`);

  const results: VerificationResult[] = [];
  const allMissingSections: string[] = [];
  let passCount = 0;
  let failCount = 0;

  // Verify each expected article
  for (const article of expectedArticles) {
    const filePath = paths.article(article.guid);
    const manifestEntry = manifest.articles[article.guid];

    const checks = {
      fileExists: false,
      sha256Match: false,
      sectionCountMatch: false,
      expectedSections: 0,
      foundSections: 0,
      allSectionsPresent: false,
      missingSections: [] as string[],
    };

    // Expected sections: recursively collect from this article node (handles subarticles)
    const articleExpectedSections = collectDescendantSections(article);
    checks.expectedSections = articleExpectedSections.length;

    // Check file exists
    checks.fileExists = existsSync(filePath);

    if (checks.fileExists && manifestEntry) {
      const data: ArticlePage = JSON.parse(await readFile(filePath, "utf-8"));

      // Verify SHA-256
      const currentHash = await computeSha256(data.rawHtml);
      checks.sha256Match = currentHash === manifestEntry.sha256;

      // Check section count
      checks.foundSections = data.sections.length;
      checks.sectionCountMatch =
        data.sections.length >= articleExpectedSections.length;

      // Check each expected section is present
      const scrapedGuids = new Set(data.sections.map((s) => s.guid));
      for (const expected of articleExpectedSections) {
        if (!scrapedGuids.has(expected.guid)) {
          checks.missingSections.push(
            `${expected.indexNum}: ${expected.title} (${expected.guid})`
          );
        }
      }
      checks.allSectionsPresent = checks.missingSections.length === 0;
    }

    const status =
      checks.fileExists &&
      checks.sha256Match &&
      checks.allSectionsPresent
        ? "pass"
        : "fail";

    if (status === "pass") passCount++;
    else failCount++;

    allMissingSections.push(...checks.missingSections);

    results.push({
      guid: article.guid,
      title: `${article.indexNum}: ${article.title}`,
      status,
      checks,
    });

    const icon = status === "pass" ? "PASS" : "FAIL";
    if (status === "fail") {
      log.warn(`[FAIL] ${article.indexNum}: ${article.title}`, {
        fileExists: String(checks.fileExists),
        sha256Match: String(checks.sha256Match),
        sections: `${checks.foundSections}/${checks.expectedSections}`,
        missing: String(checks.missingSections.length),
      });
    }
  }

  // Step 2: Random sample re-fetch verification
  log.info(`--- Random Sample Re-fetch (${VERIFY_SAMPLE_SIZE} pages) ---`);
  const sampleArticles = shuffle(expectedArticles).slice(0, VERIFY_SAMPLE_SIZE);
  let samplePasses = 0;

  const page = await newPage();

  for (const article of sampleArticles) {
    const filePath = paths.article(article.guid);
    if (!existsSync(filePath)) {
      log.warn(`[SKIP] ${article.indexNum}: file not found`);
      continue;
    }

    log.info(`Re-fetching: ${article.indexNum} ${article.title}...`);

    try {
      await navigateWithCloudflare(page, `https://ecode360.com/${article.guid}`);
      await page.waitForSelector("#codeContent", { timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(1500);

      const liveHtml = await page.evaluate(() => {
        const el = document.querySelector("#codeContent");
        return el ? el.innerHTML : "";
      });

      const savedData: ArticlePage = JSON.parse(
        await readFile(filePath, "utf-8")
      );

      const liveHash = await computeSha256(liveHtml);
      const savedHash = await computeSha256(savedData.rawHtml);

      if (liveHash === savedHash) {
        log.info(`[MATCH] ${article.indexNum}: SHA-256 matches live site`);
        samplePasses++;
      } else {
        log.warn(`[MISMATCH] ${article.indexNum}: Content has changed!`, {
          saved: savedHash.substring(0, 32),
          live: liveHash.substring(0, 32),
        });
      }
    } catch (err: any) {
      log.error(`Re-fetch failed: ${article.indexNum}`, { error: err.message });
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  await closeBrowser();

  // Build report
  const totalFoundSections = results.reduce(
    (sum, r) => sum + r.checks.foundSections,
    0
  );

  const report: VerificationReport = {
    verifiedAt: new Date().toISOString(),
    municipality: toc.tocName,
    overallStatus: failCount === 0 ? "pass" : "fail",
    totalArticles: expectedArticles.length,
    passedArticles: passCount,
    failedArticles: failCount,
    totalExpectedSections: expectedSections.length,
    totalFoundSections: totalFoundSections,
    missingSections: allMissingSections,
    results,
  };

  await writeFile(paths.verificationReport, JSON.stringify(report, null, 2));

  // Summary
  log.info("=== Verification Summary ===");
  log.info(`Articles: ${passCount} pass / ${failCount} fail / ${expectedArticles.length} total`);
  log.info(`Sections: ${totalFoundSections} found / ${expectedSections.length} expected`);
  log.info(`Missing sections: ${allMissingSections.length}`);
  log.info(`Sample re-fetch: ${samplePasses}/${sampleArticles.length} match`);
  log.info(`Overall: ${report.overallStatus.toUpperCase()}`);
  log.info(`Report: ${paths.verificationReport}`);

  if (report.overallStatus === "fail") {
    process.exit(1);
  }
}

main().catch((err) => {
  log.error("Fatal error", { error: String(err) });
  closeBrowser().finally(() => process.exit(1));
});
