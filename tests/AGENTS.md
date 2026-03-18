# Agents Guide — `tests/`

## Overview

Bun-native unit tests (`bun:test`) covering all pure-logic functions. **Zero-mock policy**: all tests use real methods, real data, and real modules — no `vi.mock()`, no stubs, no fakes.

## Running

```bash
bun test              # Run all 141 tests
bun test tests/utils  # Run a specific file
bun test --watch      # Watch mode
```

## Test Files

| File | Module | Tests |
| :--- | :--- | :--- |
| `utils.test.ts` | `src/utils.ts` — hash, flatten, shuffle, HTML→text, CSV escape, filename | 22 |
| `toc.test.ts` | `src/toc.ts` — TOC pure functions | 10 |
| `shared-paths.test.ts` | `src/shared/paths.ts` — all path constants | 10 |
| `shared-data.test.ts` | `src/shared/data.ts` — data loader contracts | 6 |
| `constants.test.ts` | `src/constants.ts` — base constants | 5 |
| `constants-extended.test.ts` | `src/constants.ts` — all env-overridable constants | 10 |
| `logger.test.ts` | `src/logger.ts` — log levels, output suppression | 6 |
| `llm-config.test.ts` | `src/llm/config.ts` — LLM parameter values | 8 |
| `search.test.ts` | `src/gui/search.ts` — in-memory search engine | 8 |
| `analytics.test.ts` | `src/gui/analytics.ts` — PCA, K-means | 7 |
| `routes.test.ts` | `src/gui/routes.ts` — API route contracts | 7 |
| `embeddings.test.ts` | `src/llm/embeddings.ts` — text chunking | 7 |
| `export.test.ts` | `src/export.ts` — CSV, Markdown, sanitize | 12 |
| `domains.test.ts` | `src/domains.ts` — domain data + search | 14 |
| `monitor.test.ts` | `src/monitor.ts` — monitor report shape | 3 |
| `news_monitor.test.ts` | `src/news_monitor.ts` — error handling, types | 3 |
| `gov_meeting_monitor.test.ts` | `src/gov_meeting_monitor.ts` — error handling, disk write | 2 |

**Total: 141 pass · 0 fail**

## Conventions

- **File naming**: `<module>.test.ts` maps to `src/<module>.ts`.
- **No mocks**: Test real behavior — if a module requires external services (Ollama, ChromaDB, network), test its error-handling / graceful-degradation path instead.
- **Data-dependent tests** (`shared-data`, `search`, `analytics`): designed to work with both empty `output/` and populated `output/`. Tests check shape contracts, not specific values.

## Adding Tests

1. Create `tests/<module>.test.ts`
2. Import functions directly: `import { fn } from "../src/<module>.ts"`
3. Use `describe` + `test` + `expect`
4. Document in this AGENTS.md and in the table above
