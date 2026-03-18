# Agents Guide — `src/alerts/`

## Overview

Real-time alert monitors for natural hazards and emergency conditions relevant to Crescent City, CA. Each module is independently runnable and exports its main function for use by thin orchestrator scripts in `scripts/`.

## Convention

- All modules **export** their primary monitoring function so `scripts/` can import them.
- All modules support `import.meta.main` for direct `bun run` invocation.
- Alert data is persisted to `output/alerts/<type>/` as JSON.
- All functions return gracefully (no throws) — errors are logged and an empty result returned.
- Use `computeSha256` from `../utils.ts` for deduplication hashing.
- Use `createLogger('module_name')` from `../logger.ts` for all logging.

## Modules

| File | Export | Output dir | Data source |
| :--- | :--- | :--- | :--- |
| `noaa_tsunami.ts` | `monitorNOAATsunamiAlerts()` | `output/alerts/tsunami/` | `api.weather.gov` REST JSON |
| `usgs_earthquake.ts` | `monitorUSGSEarthquakeAlerts()` | `output/alerts/earthquake/` | `earthquake.usgs.gov` GeoJSON feed |
| `nws_weather.ts` | `monitorNWSWeatherAlerts()` | `output/alerts/weather/{advisory,watch,warning}/` | `api.weather.gov` REST JSON |

## Key Patterns

- **In-process deduplication**: a module-level `Set<string>` tracks processed IDs; restart clears it (intentional — always re-checks on startup).
- **Crescent City relevance filter**: each module filters alerts by `areaDesc` keyword matching and/or bounding-box / point-in-polygon geometry checks.
- **Severity categorization**: NWS categorizes alerts into `advisory`, `watch`, `warning` subdirectories; USGS uses magnitude + tsunami flag.
- **GeoJSON output**: USGS saves both raw properties and a `Feature` GeoJSON object for GIS tooling.

## Running Individually

```bash
bun run alerts:tsunami      # noaa_tsunami.ts
bun run alerts:earthquake   # usgs_earthquake.ts
bun run alerts:weather      # nws_weather.ts
bun run alerts              # all three concurrently (scripts/run-alerts.ts)
```
