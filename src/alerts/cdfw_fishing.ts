/**
 * CDFW Commercial Fishing & Dungeness Crab Season Monitor
 * for Crescent City, CA.
 *
 * Crescent City is one of California's primary Dungeness crab landing ports.
 * This module fetches current CDFW marine bulletins and fishing season status.
 *
 * Data sources:
 * - CDFW Marine Bulletins: https://nrm.dfg.ca.gov/FileHandler.ashx?DocumentID=X
 * - CDFW Ocean Fishing Regulations: https://wildlife.ca.gov/Fishing/Ocean/Regulations
 * - PacFIN landing data: https://pacfin.psmfc.org (requires data sharing agreement)
 *
 * Output: output/fishing/fishing-<timestamp>.json
 */
import { createLogger } from "../logger.js";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

const logger = createLogger("cdfw-fishing");

const OUTPUT_DIR = join(process.cwd(), "output", "fishing");

// ─── Types ────────────────────────────────────────────────────────

export interface CrabSeasonStatus {
  fetchedAt: string;
  /** Whether the commercial Dungeness crab season is currently open */
  commercialOpen: boolean;
  /** Whether the recreational Dungeness crab season is currently open */
  recreationalOpen: boolean;
  /** Description of current status */
  statusNote: string;
  /** Source URL */
  sourceUrl: string;
}

export interface FishingBulletin {
  fetchedAt: string;
  title: string;
  date: string;
  content: string;
  url: string;
}

export interface FishingReport {
  fetchedAt: string;
  crabStatus: CrabSeasonStatus;
  bulletins: FishingBulletin[];
  summary: string;
}

// ─── CDFW Bulletin Fetch ──────────────────────────────────────────

/**
 * Fetch the current CDFW marine bulletin page for North Coast (Districts 1-3).
 * Returns parsed bulletin items, or empty array if unavailable.
 */
export async function fetchCdfwBulletins(): Promise<FishingBulletin[]> {
  const url = "https://wildlife.ca.gov/Fishing/Ocean/Regulations/Bulletins";
  logger.info("Fetching CDFW marine bulletins", { url });

  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "CrescentCityIntelligenceSystem/1.0 (github.com/docxology/crescent-city)",
        Accept: "text/html",
      },
    });

    if (!resp.ok) {
      logger.warn(`CDFW bulletins returned HTTP ${resp.status}`);
      return [];
    }

    const html = await resp.text();
    const bulletins: FishingBulletin[] = [];

    // Parse bulletin links — CDFW uses anchored list items with dates
    // Pattern: <a href="...">BULLETIN TITLE</a> ... date text
    const linkPattern = /<a\s+href="([^"]+)"[^>]*>([^<]+bulletin[^<]*)<\/a>/gi;
    let match: RegExpExecArray | null;

    while ((match = linkPattern.exec(html)) !== null) {
      const href = match[1];
      const title = match[2].trim();
      const fullUrl = href.startsWith("http") ? href : `https://wildlife.ca.gov${href}`;

      // Only include bulletins relevant to North Coast / crab
      const lowerTitle = title.toLowerCase();
      if (
        lowerTitle.includes("dungeness") ||
        lowerTitle.includes("crab") ||
        lowerTitle.includes("north coast") ||
        lowerTitle.includes("district 1") ||
        lowerTitle.includes("district 2") ||
        lowerTitle.includes("district 3") ||
        lowerTitle.includes("crescent city")
      ) {
        bulletins.push({
          fetchedAt: new Date().toISOString(),
          title,
          date: new Date().toISOString().split("T")[0],
          content: `CDFW bulletin: ${title}`,
          url: fullUrl,
        });
      }
    }

    logger.info(`Found ${bulletins.length} relevant CDFW bulletins`);
    return bulletins;
  } catch (err: any) {
    logger.error("Failed to fetch CDFW bulletins", { error: err.message });
    return [];
  }
}

/**
 * Determine current Dungeness crab season status based on California regulations.
 *
 * Standard CA commercial Dungeness crab season:
 * - Commercial: Opens first Tuesday on or after Nov 15 (Districts 1-4)
 * - Closes June 30 of following year (unless extended/delayed by CDFW)
 * - Recreational: Nov 4 – June 30
 *
 * This is a rule-based estimate; actual opener may be delayed by CDFW
 * for domoic acid or whale entanglement concerns.
 */
export function estimateCrabSeasonStatus(): CrabSeasonStatus {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-based
  const day = now.getDate();

  // Recreational season: Nov 4 – Jun 30
  const recreationalOpen =
    (month === 11 && day >= 4) ||
    (month === 12) ||
    (month >= 1 && month <= 6);

  // Commercial season: ~Nov 15 (first Tue on/after) – Jun 30
  const commercialOpen =
    (month === 11 && day >= 15) ||
    (month === 12) ||
    (month >= 1 && month <= 6);

  const status = commercialOpen
    ? "Commercial and recreational Dungeness crab seasons are estimated OPEN (verify with latest CDFW bulletin for domoic acid/entanglement delays)"
    : month === 11
    ? "Pre-season: commercial opener expected on/after Nov 15 — check CDFW for official opener"
    : "Dungeness crab season is estimated CLOSED (July–October)";

  return {
    fetchedAt: new Date().toISOString(),
    commercialOpen,
    recreationalOpen,
    statusNote: status,
    sourceUrl: "https://wildlife.ca.gov/Fishing/Ocean/Regulations/Bulletins",
  };
}

// ─── Main report ─────────────────────────────────────────────────

/** Run the full fishing monitor: season status + CDFW bulletins. */
export async function monitorFishing(): Promise<FishingReport> {
  logger.info("=== Starting CDFW Crescent City Fishing Monitor ===");
  await mkdir(OUTPUT_DIR, { recursive: true });

  const [bulletins, crabStatus] = await Promise.all([
    fetchCdfwBulletins(),
    Promise.resolve(estimateCrabSeasonStatus()),
  ]);

  const summary = [
    `Crab commercial: ${crabStatus.commercialOpen ? "OPEN (estimated)" : "CLOSED (estimated)"}`,
    `Crab recreational: ${crabStatus.recreationalOpen ? "OPEN (estimated)" : "CLOSED (estimated)"}`,
    `CDFW bulletins found: ${bulletins.length}`,
  ].join(" | ");

  const report: FishingReport = {
    fetchedAt: new Date().toISOString(),
    crabStatus,
    bulletins,
    summary,
  };

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = join(OUTPUT_DIR, `fishing-${ts}.json`);
  await writeFile(outPath, JSON.stringify(report, null, 2));

  logger.info(summary);
  logger.info(`Fishing report saved: ${outPath}`);
  logger.info("=== CDFW Fishing Monitor Complete ===");
  return report;
}

// CLI entry point
if (import.meta.main) {
  monitorFishing().catch((err: any) => {
    logger.error("Fishing monitor failed", { error: err.message });
    process.exit(1);
  });
}
