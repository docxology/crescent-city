# GUI Server — `src/gui/`

Lightweight Bun HTTP server serving the Crescent City Municipal Code viewer.

## Running

```bash
bun run gui        # → http://localhost:3000
PORT=8080 bun run gui   # custom port
```

## Architecture

```text
Bun.serve (server.ts)
    ├── applyMiddleware()    # rate limit + API key auth
    ├── handleApiRoute()     # /api/* handlers (routes.ts)
    │     ├── /api/toc
    │     ├── /api/article/:guid
    │     ├── /api/section/:guid
    │     ├── /api/search?q=
    │     ├── /api/stats
    │     ├── /api/chat
    │     ├── /api/analytics/*
    │     ├── /api/summarize/:guid
    │     ├── /api/domains
    │     ├── /api/monitor-status
    │     ├── /api/health
    │     ├── /api/openapi.yaml
    │     └── /api/swagger
    └── static/index.html   # SPA fallback
```

## Modules

| File | Purpose | Tests |
| :--- | :--- | :--- |
| `server.ts` | Entry point: `Bun.serve()` on `PORT` (default 3000) | Manual |
| `routes.ts` | All `/api/*` route handlers | `tests/routes.test.ts` |
| `search.ts` | In-memory full-text search (init once, query many) | `tests/search.test.ts` |
| `analytics.ts` | PCA, K-means, word loadings for the analytics dashboard | `tests/analytics.test.ts` |
| `static/index.html` | Single-file SPA (no build step) — TOC, viewer, search, analytics, chat | Manual |

## Features

- Collapsible TOC tree with 2486 nodes
- Instant keyword search with relevance ranking
- Analytics dashboard (bar charts, PCA scatter plot, word loadings)
- Per-section **✨ Summarize** via Ollama
- **💬 Chat panel** — RAG queries with cited sources
- Dark / light mode toggle

## Tests

```bash
bun test tests/routes.test.ts
bun test tests/search.test.ts
bun test tests/analytics.test.ts
```
