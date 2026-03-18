# Shared Module

## `src/shared/paths.ts` — Path Resolution

Centralized path constants for all output files. Imports `OUTPUT_DIR` and `ARTICLES_DIR` from `constants.ts`.

### `paths` Object

| Key | Value | Description |
| :--- | :--- | :--- |
| `output` | `output` | Root output directory |
| `articles` | `output/articles` | Per-article JSON directory |
| `toc` | `output/toc.json` | TOC tree file |
| `manifest` | `output/manifest.json` | Scrape manifest |
| `verificationReport` | `output/verification-report.json` | Verification results |
| `consolidatedJson` | `output/crescent-city-code.json` | Consolidated JSON export |
| `plainText` | `output/crescent-city-code.txt` | Plain text export |
| `sectionIndex` | `output/section-index.csv` | CSV section index |
| `markdown` | `output/markdown` | Markdown export directory |
| `article(guid)` | `output/articles/{guid}.json` | Per-article path function |

---

## `src/shared/data.ts` — Data Loading Layer

Reads scraped output from disk. All loaders provide **actionable error messages** including the `bun run scrape` instruction when data is absent. Articles are loaded in **parallel** via `Promise.allSettled` for speed.

### Core Loaders

| Function | Signature | Description |
| :--- | :--- | :--- |
| `loadToc` | `() → Promise<TocNode>` | Parse `output/toc.json`; throws with actionable message if absent |
| `loadManifest` | `() → Promise<ScrapeManifest>` | Parse `output/manifest.json`; throws with actionable message if absent |
| `loadArticle` | `(guid) → Promise<ArticlePage>` | Load single article JSON by GUID |
| `loadAllArticles` | `() → Promise<ArticlePage[]>` | Load all articles in parallel (returns `[]` if dir absent) |
| `loadAllSections` | `() → Promise<FlatSection[]>` | Flatten all articles into section array with article context |
| `loadSection` | `(guid) → Promise<FlatSection \| undefined>` | Find a single section by GUID across all articles |

### Search and Monitoring

| Function | Signature | Description |
| :--- | :--- | :--- |
| `searchSections` | `(query, sections?) → Promise<FlatSection[]>` | Substring search across section number, title, text |
| `loadMonitorReport` | `() → Promise<MonitorReport \| undefined>` | Load latest monitor report; `undefined` if never run |

### Existence Checks

| Function | Signature | Description |
| :--- | :--- | :--- |
| `hasScrapedData` | `() → boolean` | True if `toc.json` + `manifest.json` both exist (synchronous) |
| `hasArticles` | `() → Promise<boolean>` | True if articles directory is non-empty |

### `FlatSection` Fields

```typescript
interface FlatSection {
  guid: string;
  number: string;
  title: string;
  text: string;
  history: string;      // legislative history line
  articleGuid: string;
  articleTitle: string;
  articleNumber: string;
}
```

### Usage Pattern

All consumer modules (GUI, LLM, Export, Monitor) read through this layer. No module accesses `output/` files directly.

```typescript
import { loadAllSections, hasScrapedData, loadSection } from "../shared/data.js";

if (!hasScrapedData()) {
  console.error("Run bun run scrape first");
  process.exit(1);
}

const sections = await loadAllSections();
const single = await loadSection("some-guid");
```

### Tests

```bash
bun test tests/shared-paths.test.ts   # 10 tests
bun test tests/shared-data.test.ts    # 20 tests
```
