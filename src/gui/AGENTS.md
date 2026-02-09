# Agents Guide — `src/gui/`

## Overview

Lightweight Bun HTTP server serving a single-page application for browsing, searching, and analyzing the municipal code.

## Files

| File | Purpose | Tests |
|---|---|---|
| `server.ts` | `Bun.serve()` entry point on port 3000 | Manual only |
| `routes.ts` | API route handler (`/api/toc`, `/api/search`, `/api/article/:guid`, etc.) | `tests/routes.test.ts` |
| `search.ts` | In-memory full-text search engine over sections | `tests/search.test.ts` |
| `analytics.ts` | Code statistics, PCA projection, K-means clustering | `tests/analytics.test.ts` |
| `static/` | `index.html` — single-page frontend with dark/light theme, TOC, search, analytics, and chat |

## Key Patterns

- `handleApiRoute(url, req?)` returns `Promise<Response>`. Always returns a `Response` (404 for unmatched routes). The server routes `/api/*` requests to it and serves static files for all other paths.
- `initSearch()` must be called before `search()` — it loads all sections into memory.
- Analytics computation is CPU-intensive; results are cached after first request.
- Chat requires Ollama + ChromaDB running externally.
