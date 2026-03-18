#!/usr/bin/env bun
/**
 * scripts/run-monitor.ts — Thin orchestrator: municipal code change detection.
 *
 * Imports and runs the change detection monitor from src/monitor.ts.
 * Exits with code 1 if changes are detected (useful for CI / cron jobs).
 *
 * Usage:
 *   bun run scripts/run-monitor.ts
 *   bun run monitor
 *
 * Cron example (every Sunday at 2 AM):
 *   0 2 * * 0 cd /path/to/crescent-city && bun run monitor >> output/weekly-check.log 2>&1
 */
import { runMonitor } from "../src/monitor.ts";
import { createLogger } from "../src/logger.ts";

const logger = createLogger("run-monitor");

logger.info("=== Municipal Code Change Detection ===");

const report = await runMonitor();

logger.info("Monitor complete", {
  status: report.overallStatus,
  articlesChecked: report.articlesChecked,
  hashMismatches: report.hashMismatches.length,
  missingSections: report.missingSections.length,
  newSections: report.newSections.length,
});

if (report.overallStatus === "changed") {
  logger.warn("Changes detected — review output/monitor-report.json for details.");
  process.exit(1);
} else if (report.overallStatus === "error") {
  logger.error("Monitor errored — is output/ directory populated? Run: bun run scrape");
  process.exit(2);
}

logger.info("✅ All clear — no changes detected.");
