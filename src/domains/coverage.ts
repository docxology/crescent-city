/**
 * Domain coverage metrics — computes the percentage of municipal code sections
 * cross-referenced by each intelligence domain.
 *
 * Usage:
 *   bun run src/domains/coverage.ts
 *   import { computeDomainCoverage } from './src/domains/coverage.ts';
 *
 * Output: output/domain-coverage.json
 */
import { createLogger } from "../logger.js";
import { domains } from "../domains.js";
import { loadAllSections } from "../shared/data.js";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const logger = createLogger("domain-coverage");

export interface DomainCoverageEntry {
  domainId: string;
  domainName: string;
  referencedSectionNumbers: string[];
  /** Number of unique sections referenced by this domain */
  referencedCount: number;
  /** % of all sections cross-referenced by this domain */
  coveragePct: number;
}

export interface CoverageReport {
  computedAt: string;
  totalSections: number;
  /** Sections covered by at least one domain */
  coveredSections: number;
  /** % of all sections covered by at least one domain */
  overallCoveragePct: number;
  domains: DomainCoverageEntry[];
}

/**
 * Compute how many scraped sections each domain's topics reference.
 * Matches by section number prefix (§ stripped, normalized).
 */
export async function computeDomainCoverage(): Promise<CoverageReport> {
  logger.info("Computing domain coverage metrics...");

  const sections = await loadAllSections();
  const totalSections = sections.length;

  // Build a fast lookup: normalized section numbers
  const sectionNumbers = new Set(
    sections.map(s => s.number.replace(/§\s*/, "").trim().toLowerCase())
  );

  const globalCovered = new Set<string>();
  const domainEntries: DomainCoverageEntry[] = [];

  for (const domain of domains) {
    const refs = new Set<string>();

    for (const topic of domain.topics) {
      for (const src of topic.sources) {
        const num = src.sectionNumber.replace(/§\s*/, "").trim().toLowerCase();
        refs.add(num);
        globalCovered.add(num);
      }
    }

    // Check which refs actually exist in scraped data
    const matched = [...refs].filter(r => {
      // Exact match or prefix match (e.g., "17.04" matches "17.04.010")
      for (const sn of sectionNumbers) {
        if (sn === r || sn.startsWith(r + ".") || sn.startsWith(r + " ")) return true;
      }
      return false;
    });

    const coveragePct =
      totalSections > 0 ? Math.round((matched.length / totalSections) * 10000) / 100 : 0;

    domainEntries.push({
      domainId: domain.id,
      domainName: domain.name,
      referencedSectionNumbers: [...refs].sort(),
      referencedCount: matched.length,
      coveragePct,
    });
  }

  // Sort by coverage descending
  domainEntries.sort((a, b) => b.coveragePct - a.coveragePct);

  const coveredCount = [...globalCovered].filter(r => {
    for (const sn of sectionNumbers) {
      if (sn === r || sn.startsWith(r + ".") || sn.startsWith(r + " ")) return true;
    }
    return false;
  }).length;

  const overallCoveragePct =
    totalSections > 0 ? Math.round((coveredCount / totalSections) * 10000) / 100 : 0;

  const report: CoverageReport = {
    computedAt: new Date().toISOString(),
    totalSections,
    coveredSections: coveredCount,
    overallCoveragePct,
    domains: domainEntries,
  };

  await mkdir("output", { recursive: true });
  const outPath = join("output", "domain-coverage.json");
  await writeFile(outPath, JSON.stringify(report, null, 2));

  logger.info(
    `Domain coverage: ${coveredCount}/${totalSections} sections (${overallCoveragePct}%) covered by at least one domain`
  );
  for (const d of domainEntries) {
    logger.info(`  ${d.domainName}: ${d.referencedCount} sections (${d.coveragePct}%)`);
  }

  return report;
}

// CLI entry point
if (import.meta.main) {
  computeDomainCoverage().catch((err: any) => {
    logger.error("Coverage computation failed", { error: err.message });
    process.exit(1);
  });
}
