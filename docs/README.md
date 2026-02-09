# Crescent City Municipal Code — Documentation

Modular documentation for the scraper, verifier, exporter, web viewer, and RAG chat system.

## Contents

| Document | Description |
|----------|-------------|
| [Architecture](architecture.md) | System design, data flow, and module dependency graph |
| **Modules** | |
| [Scraping](modules/scraping.md) | Browser, TOC, content extraction, and scraper orchestrator |
| [Verification](modules/verification.md) | SHA-256 integrity checks, section presence, live re-fetch |
| [Export](modules/export.md) | JSON, Markdown, plain text, and CSV output |
| [GUI](modules/gui.md) | Web viewer, API routes, search engine, analytics |
| [LLM](modules/llm.md) | Ollama, ChromaDB, embeddings, RAG pipeline |
| [Shared](modules/shared.md) | Paths resolution and data loading layer |
| **Reference** | |
| [API Reference](api-reference.md) | All exported functions, interfaces, and types |
| [Configuration](configuration.md) | Environment variables, constants, tuning parameters |

## Quick Links

- **Source**: [`src/`](../src/)
- **Tests**: [`tests/`](../tests/) — 85 tests across 9 files
- **Output**: `output/` (gitignored)
