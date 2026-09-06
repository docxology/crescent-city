# AGENTS.md — crescent-city/.github/workflows

Contains `weekly.yml` — "Weekly Intelligence Cycle": scheduled cron
`0 7 * * 1` (Mondays 07:00 UTC) plus manual dispatch. Runs a weekly health
check and, via the `run_scrape` input, the full scrape pipeline (requires
Chromium). Uses secrets `CRESCENT_CITY_API_KEY` and var `OLLAMA_URL`.
Historical (deprecated repo) — verify before relying on any run.