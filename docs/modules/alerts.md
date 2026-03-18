# Alert Monitors Module

Real-time natural hazard monitoring for Crescent City, CA. All monitors export their primary function for use by thin orchestrator scripts in `scripts/`.

## `src/alerts/noaa_tsunami.ts` — NOAA Tsunami Alerts

Polls the NOAA Weather API for active tsunami warnings affecting the California coast, filters for Crescent City relevance, and saves to disk.

### Data Source

`GET https://api.weather.gov/alerts/active?event=Tsunami+Warning&region=CA`

### Exports

| Export | Signature | Description |
| :--- | :--- | :--- |
| `monitorNOAATsunamiAlerts` | `() → Promise<void>` | Fetch, filter, log, and save tsunami alerts |

### Filtering

- Filters for `status === "Actual"` and `msgType === "Alert"`
- Checks `areaDesc` for Crescent City / Del Norte / California keywords
- In-process deduplication via `Set<string>` (resets on restart)

### Output

`output/alerts/tsunami/alert-<id>-<timestamp>.json`

---

## `src/alerts/usgs_earthquake.ts` — USGS Earthquake Alerts

Polls the USGS GeoJSON significant hour feed for earthquakes within 200 km of Crescent City with magnitude ≥ 4.0.

### Data Source

`GET https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_hour.geojson`

### Exports

| Export | Signature | Description |
| :--- | :--- | :--- |
| `monitorUSGSEarthquakeAlerts` | `() → Promise<void>` | Fetch, filter by proximity, log, and save |

### Filtering

| Parameter | Value |
| :--- | :--- |
| Crescent City coordinates | 41.7485°N, 124.2028°W |
| Search radius | 200 km (Haversine distance) |
| Minimum magnitude | M4.0 |

Alert levels determined by magnitude and tsunami flag:
- `≥ M6.0` → WARNING
- `≥ M7.0` → CRITICAL
- `tsunami === 1` → TSUNAMI_WATCH
- `tsunami === 2` → TSUNAMI_WARNING

### Output

Saves raw data + GeoJSON `Feature` for GIS tooling to `output/alerts/earthquake/earthquake-<id>-<timestamp>.json`.

---

## `src/alerts/nws_weather.ts` — NWS Weather Alerts

Monitors National Weather Service alerts for the Northwest CA coastal zone (CAZ006) and categorizes them by severity.

### Data Source

`GET https://api.weather.gov/alerts/active?region=CA&zone=CAZ006`

### Exports

| Export | Signature | Description |
| :--- | :--- | :--- |
| `monitorNWSWeatherAlerts` | `() → Promise<void>` | Fetch, filter, categorize, log, and save |

### Severity Categorization

| Category | Criteria |
| :--- | :--- |
| `warning` | Severe severity, or Moderate + Likely certainty + Immediate urgency |
| `watch` | Moderate + Possible/Likely certainty + Future urgency |
| `advisory` | All other active alerts |

Also performs point-in-polygon check (ray casting) against alert geometry when available.

### Output

`output/alerts/weather/{advisory,watch,warning}/alert-<id>-<timestamp>.json`

---

## Common Patterns

- **Non-throwing**: All public functions return gracefully on error (log + return empty result)
- **In-process deduplication**: Module-level `Set<string>` tracks processed IDs within a run
- **User-Agent**: All HTTP requests include `CrescentCityIntelligenceSystem/1.0` header
- **import.meta.main**: Each file can be run directly via `bun run src/alerts/<file>.ts`

## Running

```bash
bun run alerts:tsunami      # NOAA only
bun run alerts:earthquake   # USGS only
bun run alerts:weather      # NWS only
bun run alerts              # all three concurrently (scripts/run-alerts.ts)
```

See [scripts/README.md](../../scripts/README.md) for cron setup.
