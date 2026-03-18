/**
 * Composite alert severity scoring for Crescent City.
 *
 * Aggregates input from all 5 alert monitors and returns a single
 * standardised composite status: CALM | WATCH | WARNING | EMERGENCY.
 *
 * Rules (applied in priority order):
 *   EMERGENCY — any active Tsunami Warning (CAP) or USGS tsunami flag ≥ 2
 *   WARNING   — active Earthquake M≥6 within 200 km, NWS Severe weather warning,
 *               or tidal water level ≥ 5 ft MLLW
 *   WATCH     — Earthquake M4-6 within 200 km, NWS watch/advisory,
 *               CDFW fishing closure, tidal level ≥ 3 ft MLLW
 *   CALM      — no active alerts meeting above thresholds
 *
 * Designed to be called by GET /api/monitor/alerts and the GUI dashboard.
 */

export type AlertSeverity = "CALM" | "WATCH" | "WARNING" | "EMERGENCY";

export interface AlertSeverityReport {
  /** Composite severity level */
  level: AlertSeverity;
  /** ISO-8601 timestamp of this assessment */
  assessedAt: string;
  /** One-line human-readable reason for the current level */
  reason: string;
  /** Per-monitor breakdown */
  monitors: {
    tsunami: MonitorStatus;
    earthquake: MonitorStatus;
    weather: MonitorStatus;
    tides: MonitorStatus;
    fishing: MonitorStatus;
  };
}

export interface MonitorStatus {
  /** CALM | WATCH | WARNING | EMERGENCY */
  level: AlertSeverity;
  /** Short human-readable status */
  summary: string;
  /** Number of active alerts/events this monitor found */
  count: number;
}

export interface TsunamiInput {
  /** Number of active Tsunami Warning CAP events */
  warningCount: number;
  /** Number of active Tsunami Watch/Advisory CAP events */
  watchCount: number;
}

export interface EarthquakeInput {
  /** Array of nearby earthquakes with magnitude + USGS tsunami flag */
  events: Array<{ magnitude: number; distanceKm: number; tsunami: number; place: string }>;
}

export interface WeatherInput {
  /** Active NWS severity levels for Crescent City zone */
  severities: Array<"advisory" | "watch" | "warning">;
  /** Number of active events */
  count: number;
}

export interface TidesInput {
  /** Current or most recent predicted water level in feet MLLW */
  waterLevelFt: number | null;
  /** true if tide data fetch succeeded */
  available: boolean;
}

export interface FishingInput {
  /** true if a fishery closure or conditional opening is in effect */
  closureActive: boolean;
  /** Optional closure message */
  closureMessage?: string;
}

/**
 * Assess tsunami monitor severity.
 */
function assessTsunami(input: TsunamiInput): MonitorStatus {
  if (input.warningCount > 0) {
    return {
      level: "EMERGENCY",
      summary: `⚠️ ${input.warningCount} active Tsunami Warning(s)`,
      count: input.warningCount + input.watchCount,
    };
  }
  if (input.watchCount > 0) {
    return {
      level: "WATCH",
      summary: `🟡 ${input.watchCount} active Tsunami Watch/Advisory`,
      count: input.watchCount,
    };
  }
  return { level: "CALM", summary: "No active tsunami alerts", count: 0 };
}

/**
 * Assess earthquake monitor severity.
 */
function assessEarthquake(input: EarthquakeInput): MonitorStatus {
  const nearbyEvents = input.events.filter((e) => e.distanceKm <= 200);
  if (nearbyEvents.length === 0) {
    return { level: "CALM", summary: "No qualifying earthquakes nearby", count: 0 };
  }

  // USGS tsunami flag 2 = tsunami generated
  const tsunamiEvents = nearbyEvents.filter((e) => e.tsunami >= 2);
  if (tsunamiEvents.length > 0) {
    return {
      level: "EMERGENCY",
      summary: `🚨 Earthquake M${tsunamiEvents[0].magnitude} with tsunami generated`,
      count: nearbyEvents.length,
    };
  }

  const severe = nearbyEvents.filter((e) => e.magnitude >= 6.0);
  if (severe.length > 0) {
    const top = severe[0];
    return {
      level: "WARNING",
      summary: `🔴 M${top.magnitude} earthquake ${top.distanceKm.toFixed(0)} km away`,
      count: nearbyEvents.length,
    };
  }

  // M4.0–5.9 in range
  const top = nearbyEvents[0];
  return {
    level: "WATCH",
    summary: `🟡 M${top.magnitude} earthquake ${top.distanceKm.toFixed(0)} km away`,
    count: nearbyEvents.length,
  };
}

/**
 * Assess NWS weather monitor severity.
 */
function assessWeather(input: WeatherInput): MonitorStatus {
  if (input.count === 0) {
    return { level: "CALM", summary: "No active weather alerts", count: 0 };
  }

  if (input.severities.includes("warning")) {
    return {
      level: "WARNING",
      summary: `🔴 ${input.count} active NWS Warning(s)`,
      count: input.count,
    };
  }
  if (input.severities.includes("watch")) {
    return {
      level: "WATCH",
      summary: `🟡 ${input.count} active NWS Watch(es)`,
      count: input.count,
    };
  }
  return {
    level: "WATCH",
    summary: `🔵 ${input.count} active NWS Advisory(ies)`,
    count: input.count,
  };
}

/**
 * Assess NOAA tides severity based on predicted water level.
 */
function assessTides(input: TidesInput): MonitorStatus {
  if (!input.available || input.waterLevelFt === null) {
    return { level: "CALM", summary: "Tides data unavailable", count: 0 };
  }
  if (input.waterLevelFt >= 5.0) {
    return {
      level: "WARNING",
      summary: `🔴 High tide ${input.waterLevelFt.toFixed(1)} ft MLLW`,
      count: 1,
    };
  }
  if (input.waterLevelFt >= 3.0) {
    return {
      level: "WATCH",
      summary: `🟡 Elevated tide ${input.waterLevelFt.toFixed(1)} ft MLLW`,
      count: 1,
    };
  }
  return {
    level: "CALM",
    summary: `Normal tides ${input.waterLevelFt.toFixed(1)} ft MLLW`,
    count: 0,
  };
}

/**
 * Assess CDFW fishing monitor severity.
 */
function assessFishing(input: FishingInput): MonitorStatus {
  if (input.closureActive) {
    return {
      level: "WATCH",
      summary: `🟡 Fishery closure in effect${input.closureMessage ? ": " + input.closureMessage : ""}`,
      count: 1,
    };
  }
  return { level: "CALM", summary: "No active fishery closures", count: 0 };
}

/** Priority ordering for severity levels */
const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  CALM: 0,
  WATCH: 1,
  WARNING: 2,
  EMERGENCY: 3,
};

/**
 * Compute composite alert severity from all 5 monitor inputs.
 *
 * @returns AlertSeverityReport with composite level and per-monitor breakdown.
 */
export function computeAlertSeverity(
  tsunami: TsunamiInput,
  earthquake: EarthquakeInput,
  weather: WeatherInput,
  tides: TidesInput,
  fishing: FishingInput
): AlertSeverityReport {
  const monitors = {
    tsunami: assessTsunami(tsunami),
    earthquake: assessEarthquake(earthquake),
    weather: assessWeather(weather),
    tides: assessTides(tides),
    fishing: assessFishing(fishing),
  };

  // Find the highest severity across all monitors
  let topLevel: AlertSeverity = "CALM";
  let topReason = "All systems nominal";

  for (const [name, status] of Object.entries(monitors)) {
    if (SEVERITY_ORDER[status.level] > SEVERITY_ORDER[topLevel]) {
      topLevel = status.level;
      topReason = `${name.charAt(0).toUpperCase() + name.slice(1)}: ${status.summary}`;
    }
  }

  return {
    level: topLevel,
    assessedAt: new Date().toISOString(),
    reason: topReason,
    monitors,
  };
}
