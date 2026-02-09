# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Scraper, verifier, exporter, web viewer, and RAG chat for the Crescent City, CA municipal code from ecode360.com. TypeScript on Bun runtime.

## Commands

```bash
bun install                  # Install dependencies
bun run scrape               # Scrape municipal code (launches Chromium, ~2s rate limit per page)
bun run verify               # Verify scraped data integrity (SHA-256 + TOC cross-reference)
bun run export               # Export to JSON, Markdown, text, CSV
bun run all                  # Run scrape → verify → export sequentially
bun run gui                  # Web viewer on http://localhost:3000

# LLM/RAG (requires Ollama + ChromaDB running)
bun run index                # Index sections into ChromaDB
bun run chat                 # Interactive RAG chat
bun run query "question"     # Single RAG query
```

Test suite: `bun test` (85 tests across 9 files). No linter configured. No build step — all scripts run directly via `bun run src/*.ts`. See `docs/` for full module documentation.

## Architecture

Pipeline: `ecode360.com → Scraper → Verifier → Exporter → GUI / LLM`

All scraped data lands in `output/` (gitignored). The scraper uses Playwright with non-headless Chromium to bypass Cloudflare Turnstile, intercepts the `/toc/CR4919` API to get the TOC tree, then visits each article page to extract sections.

**Core modules** (`src/`):

- `types.ts` — All interfaces (`TocNode`, `ArticlePage`, `SectionContent`, `ScrapeManifest`, etc.)
- `constants.ts` — `BASE_URL`, `MUNICIPALITY_CODE`, `OUTPUT_DIR`, `RATE_LIMIT_MS`
- `utils.ts` — `computeSha256`, `flattenToc`, `htmlToText`, `csvEscape`, `sanitizeFilename`
- `shared/paths.ts` — Centralized path resolution for all output files
- `shared/data.ts` — Data loading layer (`loadToc`, `loadManifest`, `loadArticle`, `loadAllSections`, `searchSections`)

**Pipeline stages:**

- `browser.ts` — Playwright lifecycle, Cloudflare bypass
- `toc.ts` — TOC fetcher via API interception
- `content.ts` — Page scraper, section extraction from `#codeContent` DOM
- `scrape.ts` — Orchestrator with manifest-based resume support
- `verify.ts` — SHA-256 verification, section presence checks, live re-fetch sample
- `export.ts` — Multi-format output (JSON, Markdown, text, CSV)

**GUI** (`src/gui/`): Bun.serve() on port 3000, single `index.html` with embedded CSS/JS (no framework, no build step). Routes in `routes.ts` (`/api/toc`, `/api/article/:guid`, `/api/search`, `/api/stats`, `/api/chat`, `/api/analytics/stats`, `/api/analytics/embeddings`, `POST /api/summarize`), in-memory search in `search.ts`, analytics computation in `analytics.ts` (PCA via power iteration + code stats). Chat panel connected to RAG pipeline via `ragQuery()`. Per-section Summarize button uses Ollama `chat()` for AI summaries.

**LLM** (`src/llm/`): Ollama embeddings + chat, ChromaDB vector store. Config in `config.ts` (env vars: `OLLAMA_URL`, `EMBEDDING_MODEL`, `CHAT_MODEL`, `CHROMA_URL`). Entry point `index.ts` handles `index`/`chat`/`query` subcommands.

## Key Patterns

- **Resume support**: The scraper saves a manifest after each article. Re-running `bun run scrape` skips already-completed articles.
- **SHA-256 integrity**: Every page's raw HTML is hashed at scrape time. The verifier independently re-computes and compares hashes.
- **Subarticle/part handling**: TOC tree has intermediate grouping nodes (6 parts, 17 subarticles) that aren't scrapable pages — their child sections are collected recursively from parent article pages.
- **Data flow**: All modules read from `output/` via `shared/data.ts`. The GUI and LLM modules are consumers of the scrape pipeline output.

## LLM Prerequisites

Ollama (`ollama serve`) with models `nomic-embed-text` and `gemma3:4b`. ChromaDB server on port 8000 (`chroma run --path chroma_data`).
