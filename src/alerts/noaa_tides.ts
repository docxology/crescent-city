/**
 * NOAA CO-OPS Tides & Currents monitor for Crescent City.
 *
 * Station: Crescent City, CA — NOAA ID 9419750
 * Lat: 41.745° N  Lon: 124.184° W
 *
 * API: api.tidesandcurrents.noaa.gov/api/prod/datagetter
 * Docs: https://api.tidesandcurrents.noaa.gov/api/prod/
 *
 * Fetches 48-hour hourly tide predictions and current water level.
 * Alerts if storm surge predicted to exceed HIGH_TIDE_ALERT_FT during high tide.
 *
 * Output: output/tides/tides-<timestamp>.json
 */
import { createLogger } from "../logger.js";
import { mkdir, writeFile, readFile, appendFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const logger = createLogger("noaa-tides");

// ─── Configuration ────────────────────────────────────────────────

/** NOAA CO-OPS station ID for Crescent City, CA */
export const CRESCENT_CITY_STATION_ID = "9419750";

/** Alert if any water level prediction exceeds this threshold (MLLW, feet) */
const HIGH_TIDE_ALERT_FT = 5.0;

/** NOAA CO-OPS API base URL */
const COOPS_BASE = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter";

const OUTPUT_DIR = join(process.cwd(), "output", "tides");
const HISTORY_PATH = join(OUTPUT_DIR, "tide-history.jsonl");

// ─── Types ────────────────────────────────────────────────────────

export interface TidePrediction {
  /** UTC datetime as "YYYY-MM-DD HH:MM" */
  t: string;
  /** Water level in feet (MLLW) */
  v: string;
}

export interface WaterLevel {
  /** UTC datetime as "YYYY-MM-DD HH:MM" */
  t: string;
  /** Observed water level in feet (MLLW) */
  v: string;
  /** Sigma (standard deviation) */
  s: string;
  /** Quality/flags */
  f: string;
  /** Quality code */
  q: string;
}

export interface TideReport {
  fetchedAt: string;
  stationId: string;
  stationName: string;
  predictions: TidePrediction[];
  waterLevel: WaterLevel | null;
  highTideAlert: boolean;
  maxPredictedLevel: number;
  alertThresholdFt: number;
  summary: string;
}

// ─── Helpers ─────────────────────────────────────────────────────

/** Format a Date as YYYYMMDD for COOPS API */
function formatDate(d: Date): string {
  return d.toISOString().split("T")[0].replace(/-/g, "");
}

/** Build a NOAA CO-OPS API URL */
function coopsUrl(
  product: string,
  begin: string,
  end: string,
  extra: Record<string, string> = {}
): string {
  const params = new URLSearchParams({
    station: CRESCENT_CITY_STATION_ID,
    product,
    begin_date: begin,
    end_date: end,
    datum: "MLLW",
    time_zone: "lst_ldt",
    interval: "h",
    units: "english",
    format: "json",
    application: "crescent-city-intelligence",
    ...extra,
  });
  return `${COOPS_BASE}?${params}`;
}

// ─── Fetch functions ──────────────────────────────────────────────

/**
 * Fetch 48-hour tide predictions for Crescent City.
 * Returns raw prediction array from NOAA CO-OPS.
 */
export async function fetchTidePredictions(): Promise<TidePrediction[]> {
  const now = new Date();
  const end = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const url = coopsUrl("predictions", formatDate(now), formatDate(end));

  logger.info("Fetching NOAA tide predictions", { station: CRESCENT_CITY_STATION_ID });

  const resp = await fetch(url, {
    headers: { "User-Agent": "CrescentCityIntelligenceSystem/1.0" },
  });
  if (!resp.ok) throw new Error(`NOAA API HTTP ${resp.status}: ${resp.statusText}`);

  const data: any = await resp.json();

  if (data.error) throw new Error(`NOAA API error: ${data.error.message}`);
  if (!Array.isArray(data.predictions)) throw new Error("Invalid NOAA response: missing predictions array");

  logger.info(`Received ${data.predictions.length} tide predictions`);
  return data.predictions as TidePrediction[];
}

/**
 * Fetch the latest observed water level reading.
 * Returns null if Crescent City sensor data is unavailable.
 */
export async function fetchCurrentWaterLevel(): Promise<WaterLevel | null> {
  const now = new Date();
  const begin = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
  const url = coopsUrl("water_level", formatDate(begin), formatDate(now));

  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "CrescentCityIntelligenceSystem/1.0" },
    });
    if (!resp.ok) return null;

    const data: any = await resp.json();
    if (data.error || !Array.isArray(data.data)) return null;

    // Return most recent reading
    return data.data[data.data.length - 1] as WaterLevel ?? null;
  } catch {
    logger.warn("Could not fetch current water level (sensor may be offline)");
    return null;
  }
}

// ─── Report ───────────────────────────────────────────────────────

/**
 * Run the complete tides monitor: fetch predictions + current level,
 * evaluate alert conditions, persist report.
 */
export async function monitorTides(): Promise<TideReport> {
  logger.info("=== Starting NOAA Crescent City Tides Monitor ===");

  await mkdir(OUTPUT_DIR, { recursive: true });

  const [predictions, waterLevel] = await Promise.all([
    fetchTidePredictions(),
    fetchCurrentWaterLevel(),
  ]);

  const levels = predictions.map(p => parseFloat(p.v)).filter(v => !isNaN(v));
  const maxPredicted = Math.max(...levels, 0);
  const highTideAlert = maxPredicted >= HIGH_TIDE_ALERT_FT;

  let summary: string;
  if (highTideAlert) {
    summary = `⚠️ HIGH TIDE ALERT: Max predicted water level ${maxPredicted.toFixed(2)} ft MLLW ≥ ${HIGH_TIDE_ALERT_FT} ft threshold`;
    logger.warn(summary, { maxPredicted, threshold: HIGH_TIDE_ALERT_FT });
  } else {
    summary = `✅ Normal: Max predicted water level ${maxPredicted.toFixed(2)} ft MLLW (threshold ${HIGH_TIDE_ALERT_FT} ft)`;
    logger.info(summary);
  }

  const report: TideReport = {
    fetchedAt: new Date().toISOString(),
    stationId: CRESCENT_CITY_STATION_ID,
    stationName: "Crescent City, CA",
    predictions,
    waterLevel,
    highTideAlert,
    maxPredictedLevel: maxPredicted,
    alertThresholdFt: HIGH_TIDE_ALERT_FT,
    summary,
  };

  // Persist timestamped JSON report
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = join(OUTPUT_DIR, `tides-${ts}.json`);
  await writeFile(outPath, JSON.stringify(report, null, 2));

  // Append one-line to history
  await appendFile(HISTORY_PATH, JSON.stringify({
    fetchedAt: report.fetchedAt,
    maxPredictedLevel: maxPredicted,
    highTideAlert,
    summary,
  }) + "\n");

  logger.info(`Tide report saved: ${outPath}`);
  logger.info("=== NOAA Tides Monitor Complete ===");
  return report;
}

// CLI entry point
if (import.meta.main) {
  monitorTides().catch((err: any) => {
    logger.error("Tides monitor failed", { error: err.message });
    process.exit(1);
  });
}
