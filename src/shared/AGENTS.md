# Agents Guide — `src/shared/`

## Overview

Shared utilities used by multiple modules: centralized path resolution and data loading.

## Files

| File | Purpose | Tests |
|---|---|---|
| `paths.ts` | All output file/directory path constants + `article(guid)` function | `tests/shared-paths.test.ts` |
| `data.ts` | Data loading functions: `loadToc`, `loadManifest`, `loadAllArticles`, `loadAllSections`, `searchSections` | `tests/shared-data.test.ts` |

## Key Patterns

- Always use `paths.article(guid)` instead of constructing article paths manually.
- `loadAllSections()` returns a flat array of `FlatSection` (section + parent article metadata), used by search and analytics.
- `searchSections(query)` does case-insensitive substring matching across section number, title, and text.
