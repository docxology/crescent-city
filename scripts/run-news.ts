#!/usr/bin/env bun
/**
 * scripts/run-news.ts — Thin orchestrator: local news RSS monitoring.
 *
 * Imports and runs the news monitoring pipeline from src/news_monitor.ts.
 * Fetches Times-Standard, Lost Coast Outpost, Humboldt Times, and KIEM-TV feeds
 * and saves relevant items to output/news/.
 *
 * Usage:
 *   bun run scripts/run-news.ts
 *   bun run news
 *   bun run news -- --keywords="tsunami,earthquake"
 *
 * CLI flags:
 *   --keywords=term1,term2   Override default filter keywords (comma-separated)
 *   --no-dedup               Skip persistent deduplication (useful for testing)
 */
import { monitorNews } from "../src/news_monitor.ts";
import { createLogger } from "../src/logger.ts";

const logger = createLogger("run-news");

// Parse CLI args
const args = process.argv.slice(2);
const keywordsArg = args.find(a => a.startsWith("--keywords="));
const filterKeywords = keywordsArg
  ? keywordsArg.replace("--keywords=", "").split(",").map(k => k.trim()).filter(Boolean)
  : undefined;

logger.info("=== Local News Monitoring ===");
if (filterKeywords) {
  logger.info(`Filtering with custom keywords: ${filterKeywords.join(", ")}`);
}

const items = await monitorNews({ filterKeywords });
logger.info(`News monitoring complete: ${items.length} relevant items saved to output/news/`);
