# Tests (`tests/`)

Unit tests for all pure-logic functions in the project. Run with:

```bash
bun test
```

## Test Files

| Test File | Module Under Test | Tests | Key Functions Covered |
|---|---|---|---|
| `utils.test.ts` | `src/utils.ts` | 22 | `computeSha256`, `flattenToc`, `shuffle`, `htmlToText`, `csvEscape`, `sanitizeFilename` |
| `constants.test.ts` | `src/constants.ts` | 5 | `BASE_URL`, `MUNICIPALITY_CODE`, `OUTPUT_DIR`, `ARTICLES_DIR`, `RATE_LIMIT_MS` |
| `toc.test.ts` | `src/toc.ts` | 10 | `getArticlePages`, `getSections`, `tocSummary` |
| `shared-paths.test.ts` | `src/shared/paths.ts` | 10 | `paths` object (all keys + `article()`) |
| `shared-data.test.ts` | `src/shared/data.ts` | 6 | `loadToc`, `loadManifest`, `loadAllArticles`, `loadAllSections`, `searchSections` |
| `search.test.ts` | `src/gui/search.ts` | 8 | `initSearch`, `search`, `getIndexedCount` |
| `analytics.test.ts` | `src/gui/analytics.ts` | 7 | `powerIteration`, `computeWordLoadings`, `kmeans` |
| `llm-config.test.ts` | `src/llm/config.ts` | 8 | `llmConfig` (all fields) |
| `routes.test.ts` | `src/gui/routes.ts` | 7 | `handleApiRoute` (404, headers, search, chat, article, section) |

**Total: 85 tests, 185 assertions, 0 failures**

## Coverage Strategy

- **Unit tested**: All pure-logic functions (no I/O, no network, no browser).
- **Not unit tested**: Integration modules (`browser.ts`, `content.ts`, `scrape.ts`, `verify.ts`, `export.ts`, `ollama.ts`, `chroma.ts`, `embeddings.ts`, `rag.ts`, `server.ts`) — these require external services (Playwright, Ollama, ChromaDB, live network) and are verified manually via `bun run`.
