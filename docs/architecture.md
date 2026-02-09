# Architecture

## System Overview

The Crescent City Municipal Code project is a complete pipeline for scraping, verifying, exporting, viewing, and querying municipal code from [ecode360.com](https://ecode360.com/CR4919).

```
ecode360.com/CR4919
        │
   ┌────▼────┐
   │ Scraper  │  Playwright + Cloudflare bypass
   └────┬────┘
        │
  output/articles/*.json  (242 articles, 2194 sections)
        │
   ┌────▼────┐
   │ Verifier │  SHA-256 + TOC cross-reference + live re-fetch
   └────┬────┘
        │
   ┌────▼────┐
   │ Exporter │  JSON, Markdown, plain text, CSV
   └────┬────┘
        │
   ┌────┴────┐
   │         │
┌──▼──┐  ┌──▼──┐
│ GUI │  │ LLM │
│:3000│  │ RAG │
└─────┘  └─────┘
```

## Data Flow

```mermaid
graph LR
    A[ecode360.com] -->|Playwright| B[Scraper]
    B --> C[output/toc.json]
    B --> D[output/articles/*.json]
    B --> E[output/manifest.json]
    D --> F[Verifier]
    C --> F
    E --> F
    F --> G[verification-report.json]
    D --> H[Exporter]
    C --> H
    H --> I[JSON + Markdown + TXT + CSV]
    D --> J[GUI Server]
    C --> J
    D --> K[LLM Indexer]
    K -->|Ollama| L[ChromaDB]
    L --> M[RAG Pipeline]
```

## Module Dependency Graph

```mermaid
graph TD
    types --> constants
    constants --> shared/paths
    shared/paths --> shared/data
    types --> utils
    utils --> browser
    browser --> toc
    toc --> content
    content --> scrape
    toc --> verify
    utils --> verify
    shared/data --> export
    utils --> export
    shared/data --> gui/search
    gui/search --> gui/routes
    gui/routes --> gui/server
    shared/data --> gui/analytics
    llm/config --> llm/ollama
    llm/config --> llm/chroma
    llm/ollama --> llm/embeddings
    llm/chroma --> llm/embeddings
    llm/ollama --> llm/rag
    llm/chroma --> llm/rag
```

## Directory Structure

```
src/
  types.ts              # All TypeScript interfaces
  constants.ts          # Centralized constants
  utils.ts              # Pure utilities (hash, flatten, HTML, CSV, filename)
  browser.ts            # Playwright lifecycle + Cloudflare bypass
  toc.ts                # TOC fetcher + tree utilities
  content.ts            # Page scraper + section extraction
  scrape.ts             # Scraper orchestrator with resume
  verify.ts             # Verification engine
  export.ts             # Multi-format exporter
  shared/
    paths.ts            # Path resolution
    data.ts             # Data loading layer
  gui/
    server.ts           # Bun.serve() HTTP server
    routes.ts           # API route handlers
    search.ts           # In-memory full-text search
    analytics.ts        # PCA + stats computation
    static/index.html   # Single-page app
  llm/
    config.ts           # LLM configuration
    ollama.ts           # Ollama API wrapper
    chroma.ts           # ChromaDB client
    embeddings.ts       # Indexing pipeline
    rag.ts              # RAG pipeline
    index.ts            # CLI entry point
tests/
  utils.test.ts         # 22 tests
  constants.test.ts     # 5 tests
  toc.test.ts           # 10 tests
  shared-paths.test.ts  # 10 tests
  shared-data.test.ts   # 6 tests
  search.test.ts        # 8 tests
  analytics.test.ts     # 7 tests
  llm-config.test.ts    # 8 tests
  routes.test.ts        # 7 tests
docs/                   # This documentation
output/                 # Scraped data (gitignored)
```

## Runtime Dependencies

| Dependency | Purpose | Required |
|-----------|---------|----------|
| [Bun](https://bun.sh) | Runtime + test runner | Always |
| [Playwright](https://playwright.dev) | Browser automation for scraping | Scraper only |
| [Ollama](https://ollama.ai) | Embeddings + chat models | LLM features |
| [ChromaDB](https://trychroma.com) | Vector storage | LLM features |
