# AGENTS.md — Crescent City Municipal Code

## Project Overview

A complete pipeline for scraping, verifying, exporting, viewing, and querying the Crescent City, CA municipal code from ecode360.com. Built with TypeScript/Bun.

## Architecture

```
ecode360.com/CR4919
        |
    [Scraper] --- Playwright + Cloudflare bypass
        |
   output/articles/*.json (242 articles, 2194 sections)
        |
   [Verifier] --- SHA-256 + TOC cross-reference + live re-fetch
        |
   [Exporter] --- JSON, Markdown, plain text, CSV
        |
   +----+----+
   |         |
 [GUI]    [LLM]
 Bun.serve  Ollama + ChromaDB
 port 3000  RAG pipeline
```

## Directory Structure

```
src/
  types.ts          # All TypeScript interfaces (TocNode, ArticlePage, SectionContent, etc.)
  constants.ts      # Centralized constants (BASE_URL, MUNICIPALITY_CODE, paths)
  utils.ts          # Shared utilities (computeSha256, flattenToc, shuffle, htmlToText, etc.)
  browser.ts        # Playwright browser lifecycle, Cloudflare Turnstile bypass
  toc.ts            # TOC fetcher — intercepts /toc/CR4919 API, tree utilities
  content.ts        # Page scraper — extracts sections from article pages
  scrape.ts         # Main scraper orchestrator with resume support
  verify.ts         # Independent verification (SHA-256, section presence, live re-fetch)
  export.ts         # Multi-format exporter (JSON, Markdown, text, CSV)
  shared/
    paths.ts        # Centralized path resolution for output files
    data.ts         # Data loading layer (loadToc, loadArticle, loadAllSections, etc.)
  gui/
    server.ts       # Bun.serve() HTTP server
    routes.ts       # API route handlers (/api/toc, /api/article/:guid, /api/search, /api/stats, /api/chat, /api/analytics/*, /api/summarize)
    search.ts       # In-memory full-text search engine
    analytics.ts    # Server-side PCA + stats computation for analytics dashboard
    static/
      index.html    # Single-page HTML app (no framework, embedded CSS/JS)
  llm/
    config.ts       # Ollama/ChromaDB configuration
    ollama.ts       # Ollama API wrapper (embed, chat, listModels)
    chroma.ts       # ChromaDB client (getOrCreateCollection, addDocuments, query)
    embeddings.ts   # Indexing pipeline (chunk, embed, store)
    rag.ts          # RAG pipeline (embed question, retrieve context, generate answer)
    index.ts        # CLI entry point (index, chat, query, status)
```

## Module Details

### Scraper (`src/scrape.ts`)

- Uses Playwright with non-headless Chromium to bypass Cloudflare Turnstile
- Intercepts the `/toc/CR4919` API response to get the full TOC tree
- Visits each article page at `ecode360.com/{guid}` to extract sections
- SHA-256 hashes raw HTML for integrity verification
- Saves progress after each article (manifest-based resume support)
- Rate-limits to 1 request every 2 seconds

### Verifier (`src/verify.ts`)

- Loads TOC and cross-references every expected section against scraped data
- Recursively checks sections nested under subarticles and parts
- Verifies SHA-256 hashes of saved content
- Re-fetches a random sample of 5 pages from the live site for byte-level comparison

### Exporter (`src/export.ts`)

- Consolidated JSON: all sections with metadata
- Markdown: organized by Title/Chapter with cross-links
- Plain text: full corpus for text processing
- CSV: section index with GUIDs for cross-referencing

### GUI (`src/gui/`)

- Lightweight Bun.serve() HTTP server on port 3000
- Single HTML file with embedded CSS and JS (no build step, no framework)
- Collapsible TOC tree, section viewer, full-text search, dark/light mode
- Slide-out chat panel connected to the RAG pipeline (`/api/chat` → `ragQuery()`) with cited sources
- Analytics dashboard (`📊 Analytics` button) with:
  - Summary cards (articles, sections, words, avg words/section)
  - Bar charts: sections and word counts per Title
  - PCA scatter plot of embedding space (color-coded by Title, hover tooltips)
  - Section length extremes (top 10 longest/shortest)
- Per-section **✨ Summarize** button using Ollama to generate comprehensive legal summaries

### LLM (`src/llm/`)

- Ollama-based embeddings and chat
- ChromaDB vector store for similarity search
- Text chunking with configurable size/overlap
- RAG pipeline: embed question → retrieve top-K chunks → generate cited answer

## Key Patterns

- **Cloudflare bypass**: Non-headless Chromium with custom user agent and `webdriver=false`
- **Resume support**: Manifest tracks scraped articles; re-running skips completed ones
- **SHA-256 verification**: Every page is hashed at scrape time and verified independently
- **Subarticle handling**: TOC tree has parts/subarticles nested within articles; the verifier recursively collects descendant sections

## Data Flow

```
scrape → output/toc.json + output/articles/*.json + output/manifest.json
verify → output/verification-report.json
export → output/crescent-city-code.json + output/markdown/ + output/*.txt + output/*.csv
gui    → reads output/ files, serves via HTTP
llm    → reads output/ files → chunks → Ollama embeddings → ChromaDB → RAG queries
```

## Development Commands

```bash
bun install                  # Install dependencies
bun run scrape               # Scrape municipal code (requires internet + Chromium)
bun run verify               # Verify scraped data integrity
bun run export               # Export to JSON/Markdown/text/CSV
bun run all                  # Run full pipeline: scrape -> verify -> export
bun run gui                  # Start web viewer on http://localhost:3000
bun run index                # Index sections into ChromaDB (requires Ollama + ChromaDB)
bun run chat                 # Interactive RAG chat
bun run query "question"     # Single RAG query
bun run status               # Show index stats and model info
```

## Prerequisites

- [Bun](https://bun.sh) v1.0+
- Playwright (auto-installed via `bun install`)
- For LLM features:
  - [Ollama](https://ollama.ai) with `nomic-embed-text` and `gemma3:4b` models
  - [ChromaDB](https://www.trychroma.com) server running on port 8000

## Known Limitations

- Cloudflare Turnstile timing can vary; scraper may need retries
- ecode360 content changes are not auto-detected (re-scrape to update)
- 6 "part" and 17 "subarticle" type nodes in TOC are intermediate groupings, not scrapable pages
- LLM answer quality depends on the Ollama model used
