# Agents Guide — `scripts/`

## Thin-Orchestrator Contract

**Every file in `scripts/` is a thin orchestrator and nothing else.** A script may contain: a shebang, a header docstring, minimal CLI flag parsing, logging setup, and a single delegated call into a `src/<pkg>/` entrypoint. Business, data, analysis, and reporting logic lives in `src/` (importable and tested); scripts are not the place for computation. Scripts run with the repo root as cwd (all `bun run` aliases come from `package.json`) and use real TypeScript imports — never shell glue that subprocesses other scripts.

## Script Inventory

| Script | npm alias | Delegates to | Emits |
| :--- | :--- | :--- | :--- |
| `run-monitor.ts` | `bun run monitor` | `src/monitor.ts` | `output/monitor-report.json` |
| `run-alerts.ts` | `bun run alerts` | `src/alerts/{noaa_tsunami,usgs_earthquake,nws_weather}.ts` | `output/alerts/{tsunami,earthquake,weather}/` |
| `run-news.ts` | `bun run news` | `src/news_monitor.ts` | `output/news/` |
| `run-meetings.ts` | `bun run gov-meetings` | `src/gov_meeting_monitor.ts` | `output/gov_meetings/` |
| `run-coverage.ts` | `bun run coverage` | `src/domains/coverage.ts` | `output/domain-coverage.json` |
| `run-readability.ts` | `bun run readability` | `src/shared/readability.ts` (+ `src/shared/data.ts`) | `output/readability.json` |
| `weekly-check.ts` | `bun run weekly-check` | All monitor/alert/news/meeting entrypoints | `output/weekly-check-summary.json` |
| `cron-setup.sh` | `bun run cron-setup` | Installs Launchd/crontab entry for `weekly-check` | macOS plist or Linux cron line |
| `weekly-check.sh` | _(legacy)_ | `bun run monitor` via shell | `output/weekly-check.log` |

## Gotchas

- **Top-level await**: all `.ts` scripts execute at import time (no `main()` wrapper) — that is the established pattern here.
- **Manual flag parsing**: `run-news.ts` (`--keywords=term1,term2`) and `run-readability.ts` (`--limit=`, `--hardest`, `--easiest`) parse `process.argv` by hand — no arg library.
- **cron-setup.sh** uses `set -euo pipefail`, supports `--dry-run`, and schedules Sunday 07:00 (the crontab examples in [README.md](README.md) differ deliberately).
- **weekly-check.sh is legacy shell glue**, kept for reference only. New scripts must be TypeScript thin orchestrators, not shell.

## Adding New Scripts

1. Create `scripts/<name>.ts` as a thin orchestrator (flags, logging, one delegated call into `src/`)
2. Import the relevant function(s) from `src/` — no inline business logic
3. Add an npm alias in `package.json`
4. Document here, in [README.md](README.md), and in the root `README.md`
5. Cover any new reusable logic with tests in `tests/` (logic goes in `src/`, so it is testable)
