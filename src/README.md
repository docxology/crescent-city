# Source Code (`src/`)

All TypeScript source modules for the Crescent City Municipal Code project.

## Structure

| File / Dir | Purpose |
|---|---|
| `browser.ts` | Playwright browser management, Cloudflare bypass |
| `constants.ts` | Project-wide constants (URLs, paths, rate limits) |
| `content.ts` | Article page scraping and section extraction |
| `export.ts` | Multi-format export (JSON, Markdown, TXT, CSV) |
| `scrape.ts` | Main scraping orchestrator with resume support |
| `toc.ts` | Table-of-contents fetch and parse from ecode360 API |
| `types.ts` | Shared TypeScript interfaces and types |
| `utils.ts` | Pure utility functions (hash, shuffle, escape, etc.) |
| `verify.ts` | Post-scrape data integrity verification |
| `gui/` | HTTP server, API routes, search engine, analytics |
| `llm/` | Ollama/ChromaDB RAG pipeline for chat |
| `shared/` | Shared path resolution and data loading helpers |

## Running

All scripts run directly via Bun:

```bash
bun run src/scrape.ts     # Scrape municipal code
bun run src/verify.ts     # Verify scraped data
bun run src/export.ts     # Export to multiple formats
bun run src/gui/server.ts # Launch GUI on :3000
bun run src/llm/index.ts  # LLM/RAG pipeline CLI
```
