#!/usr/bin/env bun
/**
 * scripts/run-coverage.ts — Thin orchestrator: domain coverage metrics.
 *
 * Computes what percentage of all scraped municipal code sections
 * are cross-referenced by each intelligence domain.
 *
 * Usage:
 *   bun run coverage
 *   bun run scripts/run-coverage.ts
 *
 * Output:
 *   output/domain-coverage.json
 */
import { computeDomainCoverage } from "../src/domains/coverage.ts";
import { createLogger } from "../src/logger.ts";

const logger = createLogger("run-coverage");

logger.info("=== Domain Coverage Analysis ===");

const report = await computeDomainCoverage();

logger.info(`=== Coverage Complete ===`);
logger.info(`Total sections: ${report.totalSections}`);
logger.info(`Covered sections: ${report.coveredSections} (${report.overallCoveragePct}%)`);
logger.info(`Report: output/domain-coverage.json`);
