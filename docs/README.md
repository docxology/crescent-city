# Crescent City Municipal Code — Documentation

Comprehensive documentation for the full pipeline: scraping, verification, export, web viewer, RAG chat, monitoring, and alerting.

## Contents

| Document | Description |
| :--- | :--- |
| [Architecture](architecture.md) | System design, data flow diagrams, full module dependency graph |
| [Configuration](configuration.md) | All env vars, constants, and tuning parameters |
| [API Reference](api-reference.md) | Complete table of all exported functions, interfaces, and types |
| **Module Guides** | |
| [Scraping](modules/scraping.md) | Browser, TOC, content extraction, and scraper orchestrator |
| [Verification](modules/verification.md) | SHA-256 integrity checks, section presence, live re-fetch |
| [Export](modules/export.md) | JSON, Markdown, plain text, and CSV output |
| [GUI](modules/gui.md) | Web viewer, API routes, search engine, analytics |
| [LLM](modules/llm.md) | Ollama, ChromaDB, embeddings, RAG pipeline |
| [Shared](modules/shared.md) | Paths resolution and data loading layer |
| [Logger](modules/logger.md) | Structured logging with levels, timestamps, module tags |
| [Domains](modules/domains.md) | Intelligence domain data with civic cross-references |
| [Monitoring](modules/monitoring.md) | Code change detection, news, and government meeting monitors |
| [Alerts](modules/alerts.md) | Real-time NOAA, USGS, and NWS hazard alert monitors |
| [API Middleware](modules/api.md) | Rate limiting, API key authentication, request logging |

## Quick Links

- **Source**: [`src/`](../src/)
- **Scripts**: [`scripts/`](../scripts/) — thin TypeScript orchestrators
- **Tests**: [`tests/`](../tests/) — 141 tests across 17 files (zero-mock policy)
- **Output**: `output/` (gitignored)

## Updating Docs

When modifying source code:

1. Update `docs/modules/<module>.md` for the relevant module.
2. Update `docs/api-reference.md` if adding new exports.
3. Update `docs/configuration.md` if adding new env vars or constants.
4. Update `docs/architecture.md` if changing module relationships or data flow.
