# API Reference

Complete reference for all exported functions, interfaces, and constants.

## Constants (`src/constants.ts`)

| Constant | Type | Value |
|----------|------|-------|
| `BASE_URL` | `string` | `https://ecode360.com` |
| `MUNICIPALITY_CODE` | `string` | `CR4919` |
| `OUTPUT_DIR` | `string` | `output` |
| `ARTICLES_DIR` | `string` | `output/articles` |
| `RATE_LIMIT_MS` | `number` | `2000` |

---

## Utility Functions (`src/utils.ts`)

| Function | Signature | Description |
|----------|-----------|-------------|
| `computeSha256` | `(text: string) → Promise<string>` | SHA-256 hash as 64-char hex string |
| `flattenToc` | `(node: TocNode) → TocNode[]` | Flatten TOC tree to array |
| `shuffle<T>` | `(arr: T[]) → T[]` | Fisher-Yates shuffle (new array) |
| `htmlToText` | `(html: string) → string` | Strip tags, decode entities, normalize whitespace |
| `csvEscape` | `(val: string) → string` | Escape value for CSV (quote if needed) |
| `sanitizeFilename` | `(name: string) → string` | Replace non-alphanumeric, truncate to 80 chars |

---

## Browser (`src/browser.ts`)

| Function | Signature |
|----------|-----------|
| `launchBrowser` | `() → Promise<BrowserContext>` |
| `closeBrowser` | `() → Promise<void>` |
| `navigateWithCloudflare` | `(page: Page, url: string, opts?: {timeout?: number}) → Promise<void>` |
| `newPage` | `() → Promise<Page>` |

---

## TOC (`src/toc.ts`)

| Function | Signature |
|----------|-----------|
| `fetchToc` | `(page: Page) → Promise<TocNode>` |
| `flattenToc` | `(node: TocNode) → TocNode[]` |
| `getArticlePages` | `(toc: TocNode) → TocNode[]` |
| `getSections` | `(toc: TocNode) → TocNode[]` |
| `tocSummary` | `(toc: TocNode) → string` |

---

## Content (`src/content.ts`)

| Function | Signature |
|----------|-----------|
| `scrapeArticlePage` | `(page: Page, article: TocNode) → Promise<ArticlePage>` |

---

## Shared (`src/shared/`)

| Function | Module | Signature |
|----------|--------|-----------|
| `paths` | `paths.ts` | Object with path constants + `article(guid)` function |
| `loadToc` | `data.ts` | `() → Promise<TocNode>` |
| `loadManifest` | `data.ts` | `() → Promise<ScrapeManifest>` |
| `loadArticle` | `data.ts` | `(guid: string) → Promise<ArticlePage>` |
| `loadAllArticles` | `data.ts` | `() → Promise<ArticlePage[]>` |
| `loadAllSections` | `data.ts` | `() → Promise<FlatSection[]>` |
| `searchSections` | `data.ts` | `(query: string, sections?: FlatSection[]) → Promise<FlatSection[]>` |

---

## GUI (`src/gui/`)

| Function | Module | Signature |
|----------|--------|-----------|
| `handleApiRoute` | `routes.ts` | `(url: URL, req?: Request) → Promise<Response>` |
| `initSearch` | `search.ts` | `() → Promise<void>` |
| `search` | `search.ts` | `(query: string, limit?: number) → SearchResult[]` |
| `getIndexedCount` | `search.ts` | `() → number` |
| `getCodeStats` | `analytics.ts` | `() → Promise<CodeStats>` |
| `getEmbeddingProjection` | `analytics.ts` | `() → Promise<EmbeddingProjection>` |
| `kmeans` | `analytics.ts` | `(data: number[][], k: number, maxIter?: number) → {centroids, assignments}` |
| `powerIteration` | `analytics.ts` | `(data: Float64Array[], dim: number, _: any, iterations?: number) → {vector, eigenvalue}` |
| `computeWordLoadings` | `analytics.ts` | `(docs: string[], projections: number[][], pcs: any[]) → WordLoading[]` |

---

## LLM (`src/llm/`)

| Function | Module | Signature |
|----------|--------|-----------|
| `llmConfig` | `config.ts` | Object with all config properties |
| `embed` | `ollama.ts` | `(text: string) → Promise<number[]>` |
| `embedBatch` | `ollama.ts` | `(texts: string[]) → Promise<number[][]>` |
| `chat` | `ollama.ts` | `(messages: ChatMessage[], context?: string) → Promise<string>` |
| `listModels` | `ollama.ts` | `() → Promise<string[]>` |
| `isOllamaRunning` | `ollama.ts` | `() → Promise<boolean>` |
| `getOrCreateCollection` | `chroma.ts` | `() → Promise<Collection>` |
| `addDocuments` | `chroma.ts` | `(docs: {...}) → Promise<void>` |
| `query` | `chroma.ts` | `(embedding: number[], topK?: number) → Promise<{ids, documents, metadatas, distances}>` |
| `getStats` | `chroma.ts` | `() → Promise<{count, name}>` |
| `isChromaRunning` | `chroma.ts` | `() → Promise<boolean>` |
| `isIndexed` | `embeddings.ts` | `() → Promise<boolean>` |
| `indexAllSections` | `embeddings.ts` | `() → Promise<void>` |
| `ragQuery` | `rag.ts` | `(userQuestion: string) → Promise<RagResponse>` |

---

## Interfaces (`src/types.ts`)

| Interface | Description |
|-----------|-------------|
| `TocNode` | Node in the ecode360 TOC tree |
| `ArticlePage` | Scraped content for one article page |
| `SectionContent` | Single section text content |
| `ScrapeManifest` | Manifest tracking all scraped articles |
| `VerificationResult` | Per-article verification result |
| `VerificationReport` | Overall verification summary |
| `FlatSection` | Section with parent article metadata |
| `SearchResult` | Search result with snippet and score |
| `ChatMessage` | LLM chat message (role + content) |
| `RagSource` | Source citation from RAG retrieval |
| `RagResponse` | Complete RAG response with answer + sources |
| `TitleStats` | Per-title statistics (analytics) |
| `CodeStats` | Aggregate code statistics (analytics) |
| `EmbeddingPoint` | Single point in PCA projection (analytics) |
| `WordLoading` | Term-to-PC correlation (analytics) |
| `EmbeddingProjection` | Full PCA projection result (analytics) |
