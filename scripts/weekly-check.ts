#!/usr/bin/env bun
/**
 * scripts/weekly-check.ts — Thin orchestrator: weekly automated health check.
 *
 * A cron-friendly script that:
 *   1. Runs the municipal code change detection monitor
 *   2. Runs all real-time alert monitors
 *   3. Summarizes results and exits non-zero if any issues found
 *
 * Replaces the legacy weekly-check.sh with a pure TypeScript equivalent
 * that can be fully type-checked and imports directly from src/.
 *
 * Usage:
 *   bun run scripts/weekly-check.ts
 *   bun run weekly-check
 *
 * Cron example (every Sunday at 2 AM):
 *   0 2 * * 0 cd /path/to/crescent-city && bun run weekly-check >> output/weekly-check.log 2>&1
 */
import { runMonitor } from "../src/monitor.ts";
import { monitorNOAATsunamiAlerts } from "../src/alerts/noaa_tsunami.ts";
import { monitorUSGSEarthquakeAlerts } from "../src/alerts/usgs_earthquake.ts";
import { monitorNWSWeatherAlerts } from "../src/alerts/nws_weather.ts";
import { monitorNews } from "../src/news_monitor.ts";
import { monitorGovMeetings } from "../src/gov_meeting_monitor.ts";
import { createLogger } from "../src/logger.ts";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

const logger = createLogger("weekly-check");
const startedAt = new Date().toISOString();

logger.info(`=== Weekly Check: ${startedAt} ===`);

// Ensure output/ exists
await mkdir(join(process.cwd(), "output"), { recursive: true });

let exitCode = 0;

// 1. Municipal code change detection
logger.info("Step 1/3: Running municipal code change detection...");
const report = await runMonitor().catch((err: Error) => {
  logger.error("Monitor failed", { error: err.message });
  return null;
});

if (!report) {
  exitCode = Math.max(exitCode, 2);
} else if (report.overallStatus === "changed") {
  logger.warn("⚠️  Municipal code changes detected — review output/monitor-report.json");
  exitCode = Math.max(exitCode, 1);
} else if (report.overallStatus === "error") {
  logger.error("Monitor errored — has the scraper been run? Try: bun run scrape");
  exitCode = Math.max(exitCode, 2);
} else {
  logger.info("✅ Municipal code: no changes detected");
}

// 2. Real-time alert monitors (run concurrently, non-fatal on failure)
logger.info("Step 2/3: Polling real-time alert feeds...");
await Promise.allSettled([
  monitorNOAATsunamiAlerts().catch((err: Error) => logger.error("NOAA monitor failed", { error: err.message })),
  monitorUSGSEarthquakeAlerts().catch((err: Error) => logger.error("USGS monitor failed", { error: err.message })),
  monitorNWSWeatherAlerts().catch((err: Error) => logger.error("NWS monitor failed", { error: err.message })),
]);
logger.info("✅ Alert monitors complete");

// 3. News + meeting monitors (non-fatal on failure)
logger.info("Step 3/3: Running news and meeting monitors...");
await Promise.allSettled([
  monitorNews().catch((err: Error) => logger.error("News monitor failed", { error: err.message })),
  monitorGovMeetings().catch((err: Error) => logger.error("Gov meeting monitor failed", { error: err.message })),
]);
logger.info("✅ News and meeting monitors complete");

// Summary
const completedAt = new Date().toISOString();
const summary = {
  startedAt,
  completedAt,
  monitorStatus: report?.overallStatus ?? "error",
  exitCode,
};
logger.info("=== Weekly Check Complete ===", summary);

// Write summary to disk for external tooling
const summaryPath = join(process.cwd(), "output", "weekly-check-summary.json");
await writeFile(summaryPath, JSON.stringify(summary, null, 2));

if (exitCode !== 0) {
  logger.warn(`Exiting with code ${exitCode} — review logs above.`);
}
process.exit(exitCode);
