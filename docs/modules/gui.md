# GUI Module

## `src/gui/server.ts` — HTTP Server

Lightweight `Bun.serve()` server on port 3000 (configurable via `PORT` env var).

- Applies the full middleware chain (`applyMiddleware`) before routing.
- Routes `/api/*` requests to `handleApiRoute()`.
- Serves static files from `src/gui/static/`.
- Falls back to `index.html` for SPA routing.
- Pre-loads search index on startup via `initSearch()`.

---

## `src/gui/routes.ts` — API Routes

All API endpoints return JSON with CORS headers (`Access-Control-Allow-Origin: *`).

LLM-dependent routes (`/api/chat`, `/api/analytics/*`, `/api/summarize`) degrade gracefully: if Ollama/ChromaDB are unavailable they return `503 Service Unavailable` rather than crashing.

### Endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| GET | `/api/health` | Liveness probe — returns `{"status":"ok","timestamp":"..."}` |
| GET | `/api/toc` | Full TOC tree (JSON) |
| GET | `/api/article/:guid` | Single article with all sections |
| GET | `/api/section/:guid` | Single section with parent article metadata |
| GET | `/api/search?q=...&limit=N` | Full-text search (default limit: 20) |
| GET | `/api/stats` | Municipality stats (article/section counts, timestamps) |
| GET | `/api/domains` | All 5 intelligence domains (from `domains.ts`) |
| GET | `/api/monitor-status` | Latest monitor report `output/monitor-report.json` |
| GET | `/api/chat?q=...` | RAG query (requires Ollama + ChromaDB) |
| GET | `/api/analytics/stats` | Code statistics (word counts, title breakdown) |
| GET | `/api/analytics/embeddings` | PCA projection of embedding vectors |
| POST | `/api/summarize` | AI-generated section summary body: `{text, number, title}` |
| GET | `/api/openapi.yaml` | OpenAPI 3.0 specification |
| GET | `/api/swagger` | Swagger UI redirect |

### Error Handling

| Code | Cause |
| :--- | :--- |
| 400 | Missing required parameters |
| 404 | Resource not found |
| 503 | External service unavailable (Ollama/ChromaDB) |
| 500 | Internal processing error |

---

## `src/gui/search.ts` — Search Engine

In-memory full-text search across all municipal code sections.

### Exports

| Function | Signature | Description |
| :--- | :--- | :--- |
| `initSearch` | `() → Promise<void>` | Load all sections into memory (singleton; subsequent calls no-op) |
| `search` | `(query, limit?) → SearchResult[]` | Keyword search with relevance ranking |
| `getIndexedCount` | `() → number` | Current number of indexed sections |

### Ranking Algorithm

| Match Type | Score Boost |
| :--- | :--- |
| Section number prefix | +10 |
| Title substring | +5 |
| Text occurrence (each) | +1 |

Results sorted by total match count descending.

---

## `src/gui/analytics.ts` — Analytics Engine

Server-side computation of municipal code statistics and PCA embedding projections.

### Exports

| Function | Signature | Description |
| :--- | :--- | :--- |
| `getCodeStats` | `() → Promise<CodeStats>` | Articles/sections/words, per-title breakdown, longest/shortest sections |
| `getEmbeddingProjection` | `() → Promise<EmbeddingProjection>` | PCA projection with K-Means clustering and word loadings |
| `kmeans` | `(data, k, maxIter?) → {centroids, assignments}` | K-Means clustering |
| `powerIteration` | `(data, dim, _, iterations?) → {vector, eigenvalue}` | Dominant eigenvector of X^T X |
| `computeWordLoadings` | `(docs, projections, pcs) → WordLoading[]` | Pearson correlation between term frequencies and PC scores |

### PCA Pipeline

1. Fetch all embeddings from ChromaDB (batched, max 2000 points)
2. Center data (subtract mean)
3. Extract top 10 principal components via sequential power iteration + deflation
4. Project all points onto PCs
5. Normalize PC1/PC2 to [-1, 1] for default view
6. K-Means clustering (k=6) on projection scores
7. Compute word loadings (top 50 terms by combined correlation)

---

## `src/gui/static/index.html` — Frontend

Single-file SPA with no build step.

### Features

| Feature | Description |
| :--- | :--- |
| **TOC browser** | Collapsible tree with 2486+ nodes |
| **Section viewer** | Full formatted section content |
| **Search** | Instant full-text search with highlighting |
| **Analytics dashboard** | Bar charts (sections/words per Title), PCA scatter plot, word loadings |
| **✨ Summarize** | Per-section Ollama-generated legal summary |
| **💬 Chat panel** | RAG queries with cited sources |
| **Dark/light mode** | Toggle persisted in localStorage |
| **Domains panel** | Intelligence domain browser with municipal code cross-refs |

### Tests

```bash
bun test tests/routes.test.ts      # 7 tests
bun test tests/search.test.ts      # 8 tests
bun test tests/analytics.test.ts   # 7 tests
```
