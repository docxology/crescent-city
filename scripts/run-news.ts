#!/usr/bin/env bun
/**
 * scripts/run-news.ts — Thin orchestrator: local news RSS monitoring.
 *
 * Imports and runs the news monitoring pipeline from src/news_monitor.ts.
 * Fetches Times-Standard, Lost Coast Outpost, and Humboldt Times feeds
 * and saves relevant items to output/news/.
 *
 * Usage:
 *   bun run scripts/run-news.ts
 *   bun run news
 */
import { monitorNews } from "../src/news_monitor.ts";
import { createLogger } from "../src/logger.ts";

const logger = createLogger("run-news");

logger.info("=== Local News Monitoring ===");
const items = await monitorNews();
logger.info(`News monitoring complete: ${items.length} relevant items saved to output/news/`);
