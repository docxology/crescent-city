# API Reference

Complete reference for all exported functions, interfaces, and constants.

## Constants (`src/constants.ts`)

| Constant | Type | Default |
| :--- | :--- | :--- |
| `BASE_URL` | `string` | `https://ecode360.com` |
| `MUNICIPALITY_CODE` | `string` | `CR4919` |
| `OUTPUT_DIR` | `string` | `output` |
| `ARTICLES_DIR` | `string` | `output/articles` |
| `RATE_LIMIT_MS` | `number` | `2000` |
| `SCRAPE_TIMEOUT_MS` | `number` | `60000` |
| `CLOUDFLARE_WAIT_MS` | `number` | `3000` |
| `SPA_RENDER_MS` | `number` | `2000` |
| `MAX_RETRIES` | `number` | `3` |
| `VERIFY_SAMPLE_SIZE` | `number` | `5` |
| `EMBED_BATCH_SIZE` | `number` | `32` |
| `OLLAMA_TIMEOUT_MS` | `number` | `120000` |

---

## Logger (`src/logger.ts`)

| Export | Signature | Description |
| :--- | :--- | :--- |
| `createLogger` | `(module: string) → Logger` | Returns a module-scoped logger |
| `getLogLevel` | `() → LogLevel` | Current global log level |
| `setLogLevel` | `(level: LogLevel) → void` | Override global log level at runtime |
| `isLevelEnabled` | `(level: LogLevel) → boolean` | Check if a level passes the current threshold |
| `LogLevel` | `type` | `"debug" \| "info" \| "warn" \| "error"` |
| `Logger` | `interface` | `{ debug, info, warn, error, module }` |

---

## Utility Functions (`src/utils.ts`)

| Function | Signature | Description |
| :--- | :--- | :--- |
| `computeSha256` | `(text: string) → Promise<string>` | SHA-256 hash as 64-char hex string |
| `flattenToc` | `(node: TocNode) → TocNode[]` | Flatten TOC tree to array |
| `shuffle<T>` | `(arr: T[]) → T[]` | Fisher-Yates shuffle (returns new array) |
| `htmlToText` | `(html: string) → string` | Strip tags, decode entities, normalize whitespace |
| `csvEscape` | `(val: string) → string` | Escape value for CSV (quote if needed) |
| `sanitizeFilename` | `(name: string) → string` | Replace non-alphanumeric, truncate to 80 chars |

---

## Browser (`src/browser.ts`)

| Function | Signature | Description |
| :--- | :--- | :--- |
| `launchBrowser` | `() → Promise<BrowserContext>` | Launches Chromium (non-headless) with Cloudflare bypass |
| `closeBrowser` | `() → Promise<void>` | Closes context and browser, resets singletons |
| `navigateWithCloudflare` | `(page: Page, url: string, opts?: {timeout?: number}) → Promise<void>` | Navigate and wait for Cloudflare to resolve |
| `newPage` | `() → Promise<Page>` | Creates a page with `webdriver=false` injected |

---

## TOC (`src/toc.ts`)

| Function | Signature | Description |
| :--- | :--- | :--- |
| `fetchToc` | `(page: Page) → Promise<TocNode>` | Intercept `/toc/CR4919` API response, return TOC tree |
| `flattenToc` | `(node: TocNode) → TocNode[]` | Re-exported from `utils.ts` |
| `getArticlePages` | `(toc: TocNode) → TocNode[]` | All scrapable page nodes |
| `getSections` | `(toc: TocNode) → TocNode[]` | All leaf section nodes |
| `tocSummary` | `(toc: TocNode) → string` | Human-readable TOC summary |

---

## Content (`src/content.ts`)

| Function | Signature | Description |
| :--- | :--- | :--- |
| `scrapeArticlePage` | `(page: Page, article: TocNode) → Promise<ArticlePage>` | Scrape one article page, extract all sections |

---

## Monitor (`src/monitor.ts`)

| Export | Signature | Description |
| :--- | :--- | :--- |
| `runMonitor` | `() → Promise<MonitorReport>` | Full change detection: hash check + section coverage |
| `checkHashes` | `() → Promise<{checked, mismatches}>` | Verify SHA-256 hashes of all saved articles |
| `checkSectionCoverage` | `() → Promise<{missing, extra}>` | Cross-reference scraped sections against TOC |
| `MonitorReport` | `interface` | `{timestamp, articlesChecked, hashMismatches, missingSections, newSections, overallStatus, summary}` |

---

## News Monitor (`src/news_monitor.ts`)

| Export | Signature | Description |
| :--- | :--- | :--- |
| `monitorNews` | `() → Promise<NewsItem[]>` | Fetch all RSS feeds, deduplicate, filter, save to `output/news/` |
| `fetchRSSFeed` | `(source: string, url: string) → Promise<NewsItem[]>` | Fetch and parse a single RSS feed |
| `NewsItem` | `interface` | `{id, title, link, pubDate, source, description, fetchedAt}` |

---

## Government Meeting Monitor (`src/gov_meeting_monitor.ts`)

| Export | Signature | Description |
| :--- | :--- | :--- |
| `monitorGovMeetings` | `() → Promise<MeetingItem[]>` | Scrape all government meeting sources, save to `output/gov_meetings/` |
| `fetchGovMeetings` | `(name: string, url: string) → Promise<MeetingItem[]>` | Scrape one meeting source |
| `saveMeetingItems` | `(items: MeetingItem[]) → Promise<void>` | Persist meeting items to JSON file |
| `MeetingItem` | `interface` | `{id, title, body, source, url, fetchedAt, hash}` |

---

## Domains (`src/domains.ts`)

| Export | Signature | Description |
| :--- | :--- | :--- |
| `domains` | `IntelligenceDomain[]` | All 5 intelligence domains (const) |
| `getDomainById` | `(id: string) → IntelligenceDomain \| undefined` | Look up domain by ID slug |
| `getDomainSummaries` | `() → DomainSummary[]` | Lightweight list (no topics) |
| `searchDomains` | `(query: string) → IntelligenceDomain[]` | Full-text search across domain names, descriptions, tags |
| `IntelligenceDomain` | `interface` | `{id, name, description, icon, topics, updatedAt}` |
| `DomainTopic` | `interface` | `{name, description, sources, externalRefs?, tags}` |
| `DomainSource` | `interface` | `{sectionNumber, relevance}` |

---

## Shared (`src/shared/`)

| Function | Module | Signature | Description |
| :--- | :--- | :--- | :--- |
| `paths` | `paths.ts` | Object | Path constants + `article(guid) → string` |
| `loadToc` | `data.ts` | `() → Promise<TocNode>` | Parse `output/toc.json` |
| `loadManifest` | `data.ts` | `() → Promise<ScrapeManifest>` | Parse `output/manifest.json` |
| `loadArticle` | `data.ts` | `(guid) → Promise<ArticlePage>` | Load single article JSON |
| `loadAllArticles` | `data.ts` | `() → Promise<ArticlePage[]>` | Load all article JSONs |
| `loadAllSections` | `data.ts` | `() → Promise<FlatSection[]>` | All sections with article metadata |
| `searchSections` | `data.ts` | `(query, sections?) → Promise<FlatSection[]>` | Substring search across sections |

---

## GUI (`src/gui/`)

| Function | Module | Signature | Description |
| :--- | :--- | :--- | :--- |
| `handleApiRoute` | `routes.ts` | `(url: URL, req?: Request) → Promise<Response>` | Main API route dispatcher |
| `initSearch` | `search.ts` | `() → Promise<void>` | Load sections into memory (singleton) |
| `search` | `search.ts` | `(query, limit?) → SearchResult[]` | Keyword search with ranking |
| `getIndexedCount` | `search.ts` | `() → number` | Number of indexed sections |
| `getCodeStats` | `analytics.ts` | `() → Promise<CodeStats>` | Aggregate stats (articles, sections, words) |
| `getEmbeddingProjection` | `analytics.ts` | `() → Promise<EmbeddingProjection>` | PCA + K-Means projection |
| `kmeans` | `analytics.ts` | `(data, k, maxIter?) → {centroids, assignments}` | K-Means clustering |
| `powerIteration` | `analytics.ts` | `(data, dim, _, iterations?) → {vector, eigenvalue}` | Dominant eigenvector via power iteration |
| `computeWordLoadings` | `analytics.ts` | `(docs, projections, pcs) → WordLoading[]` | Pearson correlation of terms to PCs |

---

## API Middleware (`src/api/middleware.ts`)

| Function | Signature | Description |
| :--- | :--- | :--- |
| `applyMiddleware` | `(req: Request) → Promise<Response \| null>` | Apply rate limit + API key auth; returns `null` to pass through |

---

## Alert Monitors (`src/alerts/`)

| Function | Module | Signature | Description |
| :--- | :--- | :--- | :--- |
| `monitorNOAATsunamiAlerts` | `noaa_tsunami.ts` | `() → Promise<void>` | Fetch NOAA CAP alerts, save to `output/alerts/tsunami/` |
| `monitorUSGSEarthquakeAlerts` | `usgs_earthquake.ts` | `() → Promise<void>` | Fetch USGS GeoJSON, filter by proximity and magnitude |
| `monitorNWSWeatherAlerts` | `nws_weather.ts` | `() → Promise<void>` | Fetch NWS alerts for CAZ006, categorize by severity |

---

## LLM (`src/llm/`)

| Function | Module | Signature | Description |
| :--- | :--- | :--- | :--- |
| `llmConfig` | `config.ts` | Object | All config properties |
| `embed` | `ollama.ts` | `(text) → Promise<number[]>` | Single text embedding via Ollama |
| `embedBatch` | `ollama.ts` | `(texts) → Promise<number[][]>` | Batch embedding |
| `chat` | `ollama.ts` | `(messages, context?) → Promise<string>` | Chat completion |
| `listModels` | `ollama.ts` | `() → Promise<string[]>` | Available Ollama models |
| `isOllamaRunning` | `ollama.ts` | `() → Promise<boolean>` | Ollama health check |
| `getOrCreateCollection` | `chroma.ts` | `() → Promise<Collection>` | Singleton ChromaDB collection |
| `addDocuments` | `chroma.ts` | `(docs) → Promise<void>` | Upsert documents |
| `query` | `chroma.ts` | `(embedding, topK?) → Promise<{ids, documents, metadatas, distances}>` | Semantic search |
| `getStats` | `chroma.ts` | `() → Promise<{count, name}>` | Collection stats |
| `isChromaRunning` | `chroma.ts` | `() → Promise<boolean>` | ChromaDB health check |
| `isIndexed` | `embeddings.ts` | `() → Promise<boolean>` | Check if collection has documents |
| `indexAllSections` | `embeddings.ts` | `() → Promise<void>` | Chunk + embed + store all sections |
| `ragQuery` | `rag.ts` | `(userQuestion) → Promise<RagResponse>` | Full RAG pipeline |

---

## Interfaces (`src/types.ts`)

| Interface | Description |
| :--- | :--- |
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
| `EmbeddingPoint` | Single point in PCA projection |
| `WordLoading` | Term-to-PC Pearson correlation |
| `EmbeddingProjection` | Full PCA projection result |

**From `src/monitor.ts`:**

| Interface | Description |
| :--- | :--- |
| `MonitorReport` | Change detection report `{timestamp, articlesChecked, hashMismatches, missingSections, newSections, overallStatus, summary}` |

**From `src/news_monitor.ts`:**

| Interface | Description |
| :--- | :--- |
| `NewsItem` | Aggregated news item `{id, title, link, pubDate, source, description, fetchedAt}` |

**From `src/domains.ts`:**

| Interface | Description |
| :--- | :--- |
| `IntelligenceDomain` | Top-level domain `{id, name, description, icon, topics, updatedAt}` |
| `DomainTopic` | Topic within a domain `{name, description, sources, externalRefs?, tags}` |
| `DomainSource` | Cross-reference to a municipal code section |
