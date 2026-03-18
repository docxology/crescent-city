#!/usr/bin/env bun
/**
 * scripts/run-alerts.ts — Thin orchestrator: run all alert monitors.
 *
 * Imports and calls the alert monitoring functions from src/alerts/*.
 * Acts as the single CLI entry point for all real-time alert polling.
 *
 * Usage:
 *   bun run scripts/run-alerts.ts
 *   bun run alerts
 *
 * Or run individual monitors:
 *   bun run alerts:tsunami
 *   bun run alerts:earthquake
 *   bun run alerts:weather
 */
import { monitorNOAATsunamiAlerts } from "../src/alerts/noaa_tsunami.ts";
import { monitorUSGSEarthquakeAlerts } from "../src/alerts/usgs_earthquake.ts";
import { monitorNWSWeatherAlerts } from "../src/alerts/nws_weather.ts";
import { createLogger } from "../src/logger.ts";

const logger = createLogger("alerts");

logger.info("=== Running All Alert Monitors ===");

await Promise.allSettled([
  monitorNOAATsunamiAlerts().catch((err) => logger.error("NOAA monitor failed", { error: err.message })),
  monitorUSGSEarthquakeAlerts().catch((err) => logger.error("USGS monitor failed", { error: err.message })),
  monitorNWSWeatherAlerts().catch((err) => logger.error("NWS monitor failed", { error: err.message })),
]);

logger.info("=== All Alert Monitors Complete ===");
