# Agents Guide — `src/`

## Overview

This directory contains all TypeScript source modules. Every file is a standalone Bun script or shared import.

## Key Conventions

- **No build step** — all files run directly via `bun run src/<file>.ts`.
- **Types**: All shared interfaces live in `types.ts`. Import from there.
- **Constants**: `constants.ts` holds `BASE_URL`, `MUNICIPALITY_CODE`, `OUTPUT_DIR`, `ARTICLES_DIR`, `RATE_LIMIT_MS`.
- **Paths**: Use `shared/paths.ts` for all file I/O paths (never hardcode paths).
- **Data loading**: Use `shared/data.ts` for loading TOC, manifest, articles, and sections.
- **Pure utilities**: `utils.ts` exports `computeSha256`, `flattenToc`, `shuffle`, `htmlToText`, `csvEscape`, `sanitizeFilename`.

## Module Overview

| Module | Integration? | Tests |
|---|---|---|
| `browser.ts` | Yes (Playwright) | No (requires browser) |
| `constants.ts` | No | `tests/constants.test.ts` |
| `content.ts` | Yes (network) | No (requires live site) |
| `export.ts` | Yes (filesystem) | No (requires scraped data) |
| `scrape.ts` | Yes (Playwright + network) | No (full integration) |
| `toc.ts` | Partial | `tests/toc.test.ts` (pure functions) |
| `types.ts` | No (types only) | N/A |
| `utils.ts` | No | `tests/utils.test.ts` |
| `verify.ts` | Yes (filesystem + network) | No (requires live site) |
| `gui/*` | Partial | `tests/routes.test.ts`, `tests/search.test.ts`, `tests/analytics.test.ts` |
| `llm/*` | Yes (Ollama/ChromaDB) | `tests/llm-config.test.ts` (config only) |
| `shared/*` | Yes (filesystem) | `tests/shared-paths.test.ts`, `tests/shared-data.test.ts` |

## Testing Strategy

Unit tests cover all **pure-logic** functions. Integration modules (browser, content, scrape, verify, export) require external services and are tested manually via `bun run`.
