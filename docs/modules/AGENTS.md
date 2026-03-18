# Agents Guide — `docs/modules/`

## Overview

Per-module documentation. Each file covers one logical component of the system.

## Files

| File | Source modules |
| :--- | :--- |
| `scraping.md` | `browser.ts`, `toc.ts`, `content.ts`, `scrape.ts` |
| `verification.md` | `verify.ts` |
| `export.md` | `export.ts` |
| `gui.md` | `gui/server.ts`, `gui/routes.ts`, `gui/search.ts`, `gui/analytics.ts` |
| `llm.md` | `llm/config.ts`, `llm/ollama.ts`, `llm/chroma.ts`, `llm/embeddings.ts`, `llm/rag.ts`, `llm/index.ts` |
| `shared.md` | `shared/paths.ts`, `shared/data.ts` |
| `logger.md` | `logger.ts` |
| `domains.md` | `domains.ts` |
| `monitoring.md` | `monitor.ts`, `news_monitor.ts`, `gov_meeting_monitor.ts` |
| `alerts.md` | `alerts/noaa_tsunami.ts`, `alerts/usgs_earthquake.ts`, `alerts/nws_weather.ts` |
| `api.md` | `api/middleware.ts` |

## Convention

Each module doc includes: purpose, exported functions with signatures, key patterns, data flow, and dependencies.
