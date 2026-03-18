# Scripts

Thin TypeScript orchestrators for the Crescent City pipeline. All business logic lives in `src/`.

## Quick Reference

| Script | Command | Description |
| :--- | :--- | :--- |
| `weekly-check.ts` | `bun run weekly-check` | Full weekly health check (all monitors) |
| `run-monitor.ts` | `bun run monitor` | Municipal code change detection |
| `run-alerts.ts` | `bun run alerts` | All alert monitors (NOAA + USGS + NWS) |
| `run-news.ts` | `bun run news` | RSS local news aggregation |
| `run-meetings.ts` | `bun run gov-meetings` | City meeting agenda scraper |

## Data Flow

```text
scripts/weekly-check.ts
    ├── src/monitor.ts           → output/monitor-report.json
    ├── src/alerts/noaa_tsunami.ts → output/alerts/tsunami/
    ├── src/alerts/usgs_earthquake.ts → output/alerts/earthquake/
    ├── src/alerts/nws_weather.ts → output/alerts/weather/
    ├── src/news_monitor.ts      → output/news/
    └── src/gov_meeting_monitor.ts → output/gov_meetings/
```

## Cron Setup

```bash
# Weekly check every Sunday at 2 AM (append to existing log)
0 2 * * 0 cd /path/to/crescent-city && bun run weekly-check >> output/weekly-check.log 2>&1

# Hourly alert polling
0 * * * * cd /path/to/crescent-city && bun run alerts >> output/alerts.log 2>&1
```

## Exit Codes

| Code | Meaning |
| :--- | :--- |
| `0` | All clear |
| `1` | Changes detected (municipal code drift) |
| `2` | Error (missing data, network failure) |

## Adding Scripts

See [AGENTS.md](AGENTS.md) for conventions.
