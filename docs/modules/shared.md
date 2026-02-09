# Shared Module

## `src/shared/paths.ts` — Path Resolution

Centralized path constants for all output files. Imports `OUTPUT_DIR` and `ARTICLES_DIR` from `constants.ts`.

### `paths` Object

| Key | Value | Description |
|-----|-------|-------------|
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

Reads scraped output from disk. Used by the GUI, LLM, and export modules.

### Exports

| Function | Signature | Description |
|----------|-----------|-------------|
| `loadToc` | `() → Promise<TocNode>` | Parse `output/toc.json` |
| `loadManifest` | `() → Promise<ScrapeManifest>` | Parse `output/manifest.json` |
| `loadArticle` | `(guid) → Promise<ArticlePage>` | Load single article JSON by GUID |
| `loadAllArticles` | `() → Promise<ArticlePage[]>` | Load all articles from `output/articles/` |
| `loadAllSections` | `() → Promise<FlatSection[]>` | Flatten all articles into section array with article metadata |
| `searchSections` | `(query, sections?) → Promise<FlatSection[]>` | Substring search across section number, title, and text |

### Usage Pattern

All consumer modules (GUI, LLM, Export) read through this layer rather than accessing files directly, ensuring consistent path resolution and data shape.
