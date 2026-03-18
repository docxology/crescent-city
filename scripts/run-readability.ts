#!/usr/bin/env bun
/**
 * scripts/run-readability.ts — Thin orchestrator: readability scoring.
 *
 * Computes Flesch-Kincaid Grade Level for every section of the municipal code.
 * Outputs a sorted report (hardest → easiest) to output/readability.json.
 *
 * Usage:
 *   bun run readability
 *   bun run scripts/run-readability.ts
 *
 * CLI flags:
 *   --limit=N     Only show top/bottom N sections (default: all)
 *   --hardest     Show hardest N sections
 *   --easiest     Show easiest N sections
 *
 * Output:
 *   output/readability.json
 */
import { scoreCorpusReadability } from "../src/shared/readability.ts";
import { loadAllSections } from "../src/shared/data.ts";
import { createLogger } from "../src/logger.ts";
import { writeFile, mkdir } from "fs/promises";

const logger = createLogger("run-readability");

const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.replace("--limit=", ""), 10) : undefined;
const hardest = args.includes("--hardest");
const easiest = args.includes("--easiest");

logger.info("=== Municipal Code Readability Scoring ===");

const sections = await loadAllSections();
logger.info(`Scoring ${sections.length} sections...`);

const scored = scoreCorpusReadability(sections); // sorted hardest → easiest

await mkdir("output", { recursive: true });
await writeFile("output/readability.json", JSON.stringify({
  computedAt: new Date().toISOString(),
  totalSections: sections.length,
  scored: scored.length,
  averageGradeLevel: scored.length > 0
    ? Math.round(scored.reduce((s, r) => s + r.score.gradeLevel, 0) / scored.length * 10) / 10
    : 0,
  hardestSections: scored.slice(0, 10),
  easiestSections: scored.slice(-10).reverse(),
  allScores: scored,
}, null, 2));

// Console summary
if (scored.length > 0) {
  const n = limit ?? 5;
  if (!easiest) {
    logger.info(`Top ${n} hardest sections:`);
    for (const row of scored.slice(0, n)) {
      logger.info(`  § ${row.number} (${row.score.difficulty}) — Grade ${row.score.gradeLevel}`);
    }
  }
  if (easiest || !hardest) {
    logger.info(`Top ${n} easiest sections:`);
    for (const row of scored.slice(-n).reverse()) {
      logger.info(`  § ${row.number} (${row.score.difficulty}) — Grade ${row.score.gradeLevel}`);
    }
  }
}

logger.info(`Readability report saved to output/readability.json`);
