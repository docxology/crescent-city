# Agents Guide — `tests/`

## Overview

Bun-native unit tests (`bun:test`) covering all pure-logic functions across the codebase.

## Running

```bash
bun test              # Run all tests
bun test tests/utils  # Run a specific test file
```

## Conventions

- **File naming**: `<module>.test.ts` maps to `src/<module>.ts` (or `src/gui/<module>.ts`, `src/llm/<module>.ts`, `src/shared/<module>.ts`).
- **No mocks**: All tests use real methods — no mock/fake/stub implementations.
- **Data-dependent tests**: `shared-data.test.ts` reads from `output/` directory. Tests are designed to work with actual scraped data.
- **Search tests**: `search.test.ts` calls `initSearch()` which loads 2194 sections from disk.

## Adding Tests

1. Create `tests/<module>.test.ts`.
2. Import functions directly from the source module.
3. Use `describe` / `test` / `expect` from `bun:test`.
4. Focus on pure-logic functions. Skip integration modules that require external services.
