# Agents Guide — `scripts/`

## Overview

**All files in `scripts/` are thin TypeScript orchestrators.** They contain no business logic — they import from `src/` and call the appropriate functions. Every script is runnable directly via `bun run <script-name>`.

## Convention

- **No inline logic** — all computation lives in `src/`.
- **Single responsibility** — one script per functional area.
- **CI-friendly exit codes** — non-zero on failure or detected changes.
- **Real imports, not shell glue** — TypeScript `import` instead of `bun run` subprocess calls.

## Scripts

| Script | npm alias | What it orchestrates |
| :--- | :--- | :--- |
| `weekly-check.ts` | `bun run weekly-check` | Full weekly health check: monitor + all alerts + news + meetings |
| `run-monitor.ts` | `bun run monitor` | Municipal code change detection (`src/monitor.ts`) |
| `run-alerts.ts` | `bun run alerts` | All three alert monitors concurrently |
| `run-news.ts` | `bun run news` | RSS news aggregation (`src/news_monitor.ts`) |
| `run-meetings.ts` | `bun run gov-meetings` | Government meeting scraper (`src/gov_meeting_monitor.ts`) |
| `weekly-check.sh` | _(legacy)_ | Bash predecessor to `weekly-check.ts` — kept for reference |

## Adding New Scripts

1. Create `scripts/<name>.ts`
2. Import the relevant function(s) from `src/`
3. Call with minimal argument processing (flags only, no business logic)
4. Add an npm alias in `package.json`
5. Document here and in the root `README.md`
