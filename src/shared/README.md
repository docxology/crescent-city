# Shared Utilities — `src/shared/`

Centralized path resolution and data loading layer for all `src/` modules.

## Modules

### `paths.ts` — Output file paths

```typescript
import { paths } from "../shared/paths.js";

paths.output          // "output/"
paths.articles        // "output/articles/"
paths.toc             // "output/toc.json"
paths.manifest        // "output/manifest.json"
paths.verificationReport // "output/verification-report.json"
paths.consolidatedJson   // "output/crescent-city-code.json"
paths.plainText          // "output/crescent-city-code.txt"
paths.sectionIndex       // "output/section-index.csv"
paths.markdown           // "output/markdown/"
paths.article(guid)      // "output/articles/<guid>.json"
```

### `data.ts` — Data loaders

```typescript
import { loadToc, loadManifest, loadArticle, loadAllArticles, loadAllSections } from "../shared/data.js";

const toc = await loadToc();               // TocNode
const manifest = await loadManifest();     // ScrapeManifest
const article = await loadArticle(guid);   // ArticlePage
const articles = await loadAllArticles();  // ArticlePage[]
const sections = await loadAllSections();  // SectionContent[]
```

All loaders throw if files are absent — callers should handle errors or use `try/catch`.

## Tests

```bash
bun test tests/shared-paths.test.ts
bun test tests/shared-data.test.ts
```
