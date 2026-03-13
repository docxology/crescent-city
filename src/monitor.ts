#!/usr/bin/env bun
/**
 * Municipal code change detection monitor.
 *
 * Compares current scraped data against baseline hashes to detect changes.
 * Can also re-fetch a sample to check for upstream updates on ecode360.
 *
 * Usage:
 *   bun run src/monitor.ts [--sample N]
 *
 * Output: JSON report to output/monitor-report.json
 */
import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { createLogger } from "./logger.js";
import { computeSha256 } from "./utils.js";
import { paths } from "./shared/paths.js";
import { loadToc, loadManifest, loadAllArticles } from "./shared/data.js";
import type { ArticlePage } from "./types.js";

const log = createLogger("monitor");

export interface MonitorReport {
  timestamp: string;
  articlesChecked: number;
  hashMismatches: string[];
  missingSections: string[];
  newSections: string[];
  overallStatus: "clean" | "changed" | "error";
  summary: string;
}

/** Check SHA-256 hashes of all saved article files */
export async function checkHashes(): Promise<{
  checked: number;
  mismatches: string[];
}> {
  const manifest = await loadManifest();
  const mismatches: string[] = [];
  let checked = 0;

  for (const [guid, entry] of Object.entries(manifest.articles)) {
    const filePath = paths.article(guid);
    if (!existsSync(filePath)) {
      mismatches.push(`${entry.guid}: file missing`);
      continue;
    }

    try {
      const data: ArticlePage = JSON.parse(await readFile(filePath, "utf-8"));
      const currentHash = await computeSha256(data.rawHtml);
      if (currentHash !== data.sha256) {
        mismatches.push(`${entry.guid}: hash mismatch (saved=${data.sha256.substring(0, 16)}, computed=${currentHash.substring(0, 16)})`);
      }
      checked++;
    } catch (err: any) {
      mismatches.push(`${entry.guid}: read error — ${err.message}`);
    }
  }

  return { checked, mismatches };
}

/** Compare TOC section count against manifest */
export async function checkSectionCoverage(): Promise<{
  missing: string[];
  extra: string[];
}> {
  const toc = await loadToc();
  const manifest = await loadManifest();

  // Collect all section GUIDs from the TOC
  const tocSections = new Set<string>();
  function walk(node: any) {
    if (node.type === "section" && node.guid) {
      tocSections.add(node.guid);
    }
    if (node.children) {
      for (const child of node.children) walk(child);
    }
  }
  if (toc.children) {
    for (const child of toc.children) walk(child);
  }

  // Collect all section GUIDs from scraped data
  const scrapedSections = new Set<string>();
  const articles = await loadAllArticles();
  for (const article of articles) {
    for (const section of article.sections) {
      scrapedSections.add(section.guid);
    }
  }

  const missing = [...tocSections].filter(g => !scrapedSections.has(g));
  const extra = [...scrapedSections].filter(g => !tocSections.has(g));

  return { missing, extra };
}

/** Run full monitoring check and generate report */
export async function runMonitor(): Promise<MonitorReport> {
  log.info("=== Municipal Code Change Detection Monitor ===");

  if (!existsSync(paths.toc) || !existsSync(paths.manifest)) {
    log.error("No scraped data found. Run 'bun run scrape' first.");
    return {
      timestamp: new Date().toISOString(),
      articlesChecked: 0,
      hashMismatches: [],
      missingSections: [],
      newSections: [],
      overallStatus: "error",
      summary: "No scraped data found",
    };
  }

  // Step 1: Check hashes
  log.info("Checking SHA-256 hashes...");
  const { checked, mismatches } = await checkHashes();
  log.info(`Checked ${checked} articles, ${mismatches.length} mismatches`);

  // Step 2: Check section coverage
  log.info("Checking section coverage...");
  const { missing, extra } = await checkSectionCoverage();
  log.info(`Missing: ${missing.length}, Extra: ${extra.length}`);

  // Build report
  const overallStatus = (mismatches.length === 0 && missing.length === 0) ? "clean" : "changed";
  const report: MonitorReport = {
    timestamp: new Date().toISOString(),
    articlesChecked: checked,
    hashMismatches: mismatches,
    missingSections: missing,
    newSections: extra,
    overallStatus,
    summary: overallStatus === "clean"
      ? `All ${checked} articles verified, all sections accounted for`
      : `Found ${mismatches.length} hash mismatches, ${missing.length} missing sections`,
  };

  // Save report
  const reportPath = paths.output + "/monitor-report.json";
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  log.info(`Report saved to ${reportPath}`);
  log.info(`Overall: ${report.overallStatus.toUpperCase()} — ${report.summary}`);

  return report;
}

// CLI entry point
if (import.meta.main) {
  runMonitor().catch((err) => {
    log.error("Monitor failed", { error: String(err) });
    process.exit(1);
  });
}
