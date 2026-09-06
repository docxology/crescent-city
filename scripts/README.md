# Scripts

Thin orchestrators for the Crescent City pipeline. All business logic lives in `src/`; scripts only parse minimal CLI flags, log, and delegate.

## Quick Reference

| Script | Purpose | Delegates to | Run command |
| :--- | :--- | :--- | :--- |
| `run-monitor.ts` | Municipal code change detection | `src/monitor.ts` | `bun run monitor` |
| `run-alerts.ts` | All real-time alert monitors (NOAA tsunami + USGS earthquake + NWS weather) | `src/alerts/noaa_tsunami.ts`, `src/alerts/usgs_earthquake.ts`, `src/alerts/nws_weather.ts` | `bun run alerts` |
| `run-news.ts` | Local news RSS aggregation | `src/news_monitor.ts` | `bun run news` |
| `run-meetings.ts` | City meeting agenda scraping | `src/gov_meeting_monitor.ts` | `bun run gov-meetings` |
| `run-coverage.ts` | Domain coverage metrics (% of sections cross-referenced per domain) | `src/domains/coverage.ts` | `bun run coverage` |
| `run-readability.ts` | Flesch-Kincaid readability scoring of all sections | `src/shared/readability.ts`, `src/shared/data.ts` | `bun run readability` |
| `weekly-check.ts` | Full weekly health check (monitor + alerts + news + meetings) | All of the above entrypoints | `bun run weekly-check` |
| `cron-setup.sh` | Install Sunday 07:00 schedule (macOS Launchd plist / Linux crontab) for `weekly-check` | shell only | `bun run cron-setup` (`--dry-run` supported) |
| `weekly-check.sh` | Legacy bash predecessor of `weekly-check.ts` (runs the monitor only) | `bun run monitor` via shell | `./scripts/weekly-check.sh` |

## Data Flow

```text
scripts/weekly-check.ts
    ├── src/monitor.ts           → output/monitor-report.json
    ├── src/alerts/noaa_tsunami.ts → output/alerts/tsunami/
    ├── src/alerts/usgs_earthquake.ts → output/alerts/earthquake/
    ├── src/alerts/nws_weather.ts → output/alerts/weather/
    ├── src/news_monitor.ts      → output/news/
    └── src/gov_meeting_monitor.ts → output/gov_meetings/

scripts/run-coverage.ts     → src/domains/coverage.ts     → output/domain-coverage.json
scripts/run-readability.ts  → src/shared/readability.ts   → output/readability.json
```

## Cron Setup

`cron-setup.sh` installs a ready-made Sunday 07:00 schedule for `weekly-check` (Launchd on macOS, crontab on Linux). To hand-roll crontab entries instead:

```bash
# Weekly check every Sunday at 2 AM (append to existing log)
0 2 * * 0 cd /path/to/crescent-city && bun run weekly-check >> output/weekly-check.log 2>&1

# Hourly alert polling
0 * * * * cd /path/to/crescent-city && bun run alerts >> output/alerts.log 2>&1
```

## Exit Codes

Applies to `run-monitor.ts` and `weekly-check.ts` (cron/CI-friendly):

| Code | Meaning |
| :--- | :--- |
| `0` | All clear |
| `1` | Changes detected (municipal code drift) |
| `2` | Error (missing data, network failure) |

## Adding Scripts

See [AGENTS.md](AGENTS.md) for the thin-orchestrator contract and conventions.
