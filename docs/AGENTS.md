# Agents Guide — `docs/`

## Overview

Comprehensive project documentation covering architecture, all src/ modules, API reference, and configuration.

## Structure

| File | Content |
| :--- | :--- |
| `README.md` | Documentation index with links to all sections |
| `architecture.md` | System architecture, data flow diagram, module dependency graph |
| `api-reference.md` | Complete table of all exported functions, interfaces, and constants |
| `configuration.md` | All environment variables, constants, and tuning parameters |
| `modules/` | Per-module detailed documentation (one file per logical component) |

## Module Docs (`docs/modules/`)

| File | Covers |
| :--- | :--- |
| `scraping.md` | `browser.ts`, `toc.ts`, `content.ts`, `scrape.ts` |
| `verification.md` | `verify.ts` |
| `export.md` | `export.ts` |
| `gui.md` | `server.ts`, `routes.ts`, `search.ts`, `analytics.ts` |
| `llm.md` | `config.ts`, `ollama.ts`, `chroma.ts`, `embeddings.ts`, `rag.ts`, `index.ts` |
| `shared.md` | `shared/paths.ts`, `shared/data.ts` |
| `logger.md` | `logger.ts` |
| `domains.md` | `domains.ts` |
| `monitoring.md` | `monitor.ts`, `news_monitor.ts`, `gov_meeting_monitor.ts` |
| `alerts.md` | `alerts/noaa_tsunami.ts`, `alerts/usgs_earthquake.ts`, `alerts/nws_weather.ts` |
| `api.md` | `api/middleware.ts` |

## Updating Docs

When modifying source code:

1. Update `docs/modules/<module>.md` for the affected component.
2. Update `docs/api-reference.md` if adding new exports.
3. Update `docs/configuration.md` if adding new env vars or constants.
4. Update `docs/architecture.md` if module relationships change.
