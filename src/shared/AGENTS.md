# Agents Guide — `src/shared/`

## Overview

Data access layer shared by all `src/` modules. Centralizes output file paths and data loading so no module hardcodes paths or re-implements file I/O logic.

## Convention

- **Never hardcode paths** — always import from `paths.ts`.
- **Never read files directly** — use `data.ts` loader functions.
- These modules have **no side effects** on import (no global state, no startup I/O).

## Modules

| File | Purpose | Tests |
| :--- | :--- | :--- |
| `paths.ts` | Centralized `paths` object with all output file/dir paths | `tests/shared-paths.test.ts` |
| `data.ts` | Async data loaders: `loadToc()`, `loadManifest()`, `loadArticle()`, `loadAllArticles()`, `loadAllSections()` | `tests/shared-data.test.ts` |

## Public API

```typescript
import { paths } from "../shared/paths.js";
import { loadToc, loadManifest, loadAllSections } from "../shared/data.js";

const toc = await loadToc();           // TocNode
const manifest = await loadManifest(); // ScrapeManifest
const sections = await loadAllSections(); // SectionContent[]

paths.toc          // → "output/toc.json"
paths.manifest     // → "output/manifest.json"
paths.output       // → "output/"
paths.articles     // → "output/articles/"
paths.article(guid) // → "output/articles/<guid>.json"
```

## Data Dependencies

All loaders require the `output/` directory to be populated by `bun run scrape`. Tests that depend on real data gracefully return empty/default results when output data is absent.
