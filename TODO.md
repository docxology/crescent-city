# TODO — Crescent City Municipal Intelligence

> Remaining development backlog · v1.4.0 · 297 tests passing
> Jump to: [Phase 1](#phase-1--production-hardening) · [Phase 2](#phase-2--search--query-enhancement) · [Phase 3](#phase-3--monitoring-expansion) · [Phase 4](#phase-4--alert-system) · [Phase 5](#phase-5--intelligence-domains) · [Phase 6](#phase-6--analytics--reporting) · [Phase 7](#phase-7--marine--harbor-intelligence) · [Phase 8](#phase-8--infrastructure) · [Phase 9](#phase-9--gui-enhancements) · [Phase 10](#phase-10--data-quality--freshness)

---

## Phase 1 — Production Hardening

### 1.1 Rate Limiting
- [ ] Add rate limit metric to `/api/health` (current usage per-IP, peak, blocked count)
- [x] **Test clock injection / sliding window exhaustion**: `tests/middleware_sliding_window.test.ts` — 5 tests covering window exhaustion, 429 response, Retry-After header, clock reset

### 1.2 Scraper Robustness
- [ ] **Cloudflare stall detection**: detect Turnstile challenge stuck >10s → log suggestion to retry with `CLOUDFLARE_MAX_WAIT_MS` env var
- [ ] **Network error retry**: exponential backoff on `fetch` errors mid-scrape (`RATE_LIMIT_MS * 2`, max 3 retries per article)
- [ ] **HTTP 503/redirect detection**: detect ecode360.com maintenance mode or redirect → bail gracefully with actionable error
- [ ] **Progress bar**: live terminal progress indicator showing scraped/total/failed counts
- [ ] **Scrape metrics**: record per-article timing in manifest for performance analysis

### 1.3 Error Boundaries
- [ ] **GUI error banner**: render user-facing error UI for failed `/api/*` responses in `static/index.html`
- [ ] **Ollama preflight**: add `ollama check` before `bun run index` — fail fast with install instructions if not running
- [ ] **ChromaDB preflight**: check collection exists before RAG query; better error message if empty

---

## Phase 2 — Search & Query Enhancement

### 2.1 Search Engine
- [x] **Stemmer exceptions**: `STEMMER_EXCEPTIONS` set in `search.ts` — 13 legal compound terms (planning, zoning, housing, parking, etc.) preserved from Porter stemmer
- [ ] **Fuzzy matching**: Levenshtein distance for typo-tolerant queries ("harbr" → "harbor")
- [ ] **Field-level search**: `?field=number` to search only section numbers

### 2.2 RAG Pipeline
- [ ] **Adaptive topK**: tune retrieval count based on estimated query complexity (short/specific → top-5, broad → top-15)
- [ ] **Query expansion**: expand with CA municipal law synonyms before embedding
- [ ] **Reranking**: cross-encode top-20 retrieved chunks → return top-5 (better precision)
- [ ] **Conversation history**: support multi-turn chat with context window management
- [ ] **Citation format**: improve source citations to include direct ecode360 deep-links
- [ ] **Model selection**: `/api/chat?model=llama3:8b` to override default model per request
- [ ] **Streaming response**: Server-Sent Events for word-by-word streaming of RAG answers

### 2.3 Structured Query Interface
- [ ] `/api/history?guid=...` legislative history for a specific section (ordinance chain)
- [ ] `/api/compare?guid1=...&guid2=...` diff two sections or revisions
- [ ] `/api/similar?guid=...` find semantically similar sections using ChromaDB

---

## Phase 3 — Monitoring Expansion

### 3.1 News Monitor
- [ ] **Del Norte Triplicate**: add feed when public RSS becomes available (currently no API)
- [ ] **KHUM-FM Northern California**: add local radio news RSS if available
- [ ] **Sentiment scoring**: classify each filtered article as positive/negative/neutral (transformer or rule-based)
- [ ] **Aggregated digest**: daily digest of top-5 articles by relevance + sentiment at `output/news/daily-digest.json`
- [ ] **Slack/webhook alert**: POST to configurable webhook URL when high-urgency civic keywords detected

### 3.2 Government Meeting Monitor
- [ ] **Agenda item extraction**: parse HTML agendas with `@xmldom/xmldom` to produce structured agenda item list `{item, description, action}`
- [ ] **Vote record extraction**: parse minutes HTML to record yea/nay/abstain for each resolution
- [ ] **SHA-256 change detection**: hash each agenda/minutes document → persist at `output/gov_meetings/seen-hashes.json` → alert on hash change
- [ ] **Code cross-reference**: keyword-match agenda items to relevant municipal code sections via BM25
- [ ] **Agenda calendar**: infer next meeting dates from past schedule → proactive reminder
- [ ] **PDF support**: use pdfparse or Bun WASM to extract text from PDF agendas/minutes

### 3.3 Municipal Code Change Monitor
- [ ] **`--full-rescrape` flag**: bypass resume, re-fetch all 242 articles regardless of manifest state
- [ ] **Diff report**: when hashes mismatch, generate human-readable diff of changed sections → `output/monitor-diff.json`
- [ ] **Version snapshots**: archive a full JSON snapshot on each change detection run for historical diff comparison
- [ ] **Change notification**: webhook/email notification when municipal code changes detected

---

## Phase 4 — Alert System

### 4.1 Tsunami Alerts (NOAA)
- [ ] **CAP polygon geometry**: parse `geometry.coordinates` from CAP GeoJSON → compute exact distance from Crescent City harbor (41.745°N, 124.184°W) using Haversine
- [ ] **Persistent alert dedup**: `output/alerts/tsunami/seen-ids.json` to prevent re-processing same CAP alert across runs
- [ ] **Alert history JSONL**: `output/alerts/tsunami/history.jsonl` with timestamp, event, severity, distance
- [ ] **Evacuation route section lookup**: when tsunami alert fires, automatically surface relevant code sections (shelter, EOC, mutual aid)
- [ ] **False positive handling**: distinguish "Watch" vs "Warning" vs "Advisory" severity levels

### 4.2 Earthquake Alerts (USGS)
- [ ] **Alert history JSONL**: `output/alerts/earthquake/history.jsonl` (timestamp, mag, depth, distance, Cascadia flag)
- [ ] **Cascadia tracking**: specific flag when epicenter matches Cascadia Subduction Zone geometry
- [ ] **Tsunami potential scoring**: cross-reference USGS `alert` field (green/yellow/orange/red) with tsunami potential
- [ ] **Aftershock sequence**: detect aftershock swarms (>3 events in 24h) and summarize

### 4.3 Weather Alerts (NWS)
- [ ] **Alert history JSONL**: `output/alerts/weather/history.jsonl`
- [ ] **Coastal flood advisory (CFW)** parsing: extract predicted surge height, timing, affected beaches
- [ ] **High wind advisory**: track sustained wind + gust values for harbor operations
- [ ] **Storm track overlay**: map NWS storm track to harbor exposure geometry

### 4.4 Alert Aggregation
- [ ] **Alert dashboard widget**: GUI panel showing current composite status with last-updated timestamp
- [ ] **Alert history comparison**: diff consecutive alert runs to detect new vs cleared events

---

## Phase 5 — Intelligence Domains

### 5.3 Coverage & Quality
- [ ] **Expand Emergency domain**: add specific tsunami evacuation route section GUIDs (Title 8 + Title 12 coastal access)
- [ ] **External resource validation**: verify all external URLs in domain definitions return 200 (link checker)
- [ ] **Domain summary auto-generation**: use Ollama to generate a 2-paragraph plain-English summary per domain

---

## Phase 6 — Analytics & Reporting

### 6.1 Readability
- [ ] **Gunning Fog Index**: add as second readability metric for comparison
- [ ] **Readability trend**: compare section readability across ordinance amendment dates (requires historical data)
- [ ] **Plain-language rewrite suggestions**: use Ollama to draft simplified versions of high-grade-level sections

### 6.2 Automated Reporting
- [ ] **Monthly civic health report**: auto-generate `output/reports/monthly-YYYY-MM.md` summarizing new/changed code sections, alerts, news, meetings, domain coverage changes
- [ ] `/api/report/latest` serving the most recent monthly report
- [ ] **Word frequency tracking**: compare word frequency across multi-version snapshots (detect emerging legal terms)
- [ ] **Section longevity**: identify oldest unmodified sections (most likely to be outdated)

### 6.3 Visualization Enhancements
- [ ] **Readability heatmap**: color-code TOC tree by grade level (green=plain, red=legal)
- [ ] **Coverage visualization**: domain coverage donut charts in analytics dashboard
- [ ] **Alert timeline chart**: chronological chart of all alert events in `output/alerts/`
- [ ] **RAG query analytics**: frequency chart of most-queried topics from `rag-queries.jsonl`

---

## Phase 7 — Marine & Harbor Intelligence

### 7.1 Tides & Marine Conditions
- [ ] **USCG coastal safety broadcasts**: Sector San Francisco / Sector Humboldt Bay safety broadcasts via govdelivery API or polling
- [ ] **Marine weather**: NOAA offshore forecast zone PZZ455 (Northern California nearshore) parsing
- [ ] **Swell height**: NOAA buoy data for NDBC Station 46027 (Santa Cruz, near Crescent City) → wave height/period

### 7.2 Port & Fisheries Data
- [ ] **PacFIN landing data**: weekly Dungeness crab and groundfish landings at Crescent City port (ex-vessel value, trip count)
- [ ] **Vessel AIS tracking**: public AIS feed (MarineTraffic/AISHub) for harbor entry/exit traffic
- [ ] **Permit cross-reference**: map harbor commission permit sections to active vessel/business license data

### 7.3 Harbor Commission Monitoring
- [ ] **Harbor Commission meeting agendas**: dedicated parser for harbor-specific agenda format
- [ ] **Dredging schedule**: parse harbor dredging permit documents from US Army Corps of Engineers permits
- [ ] **Fuel price tracking**: scrape fuel dock published prices for compliance with Title 13 harbor rate schedule

---

## Phase 8 — Infrastructure

### 8.1 Testing
- [ ] **`tests/browser.test.ts`**: Playwright error handling — page timeout, dead page detection, retry behavior
- [ ] **`tests/content-fixture.test.ts`**: section extraction from fixture HTML strings (no live browser needed)
- [x] **`tests/routes.integration.test.ts`**: real Bun.serve() integration tests covering health, search, stats/count, domains, sections, Content-Type, ETag (15 tests)
- [x] **Sliding window exhaustion test**: `tests/middleware_sliding_window.test.ts` — 5 tests using external IPs + _testHooks clock injection
- [ ] **Coverage gate**: integrate `bun test --coverage` with minimum coverage threshold (target: 60%)

### 8.2 Performance
- [ ] **ETag caching**: add `ETag` + `If-None-Match` headers for static API responses (toc, readability, coverage)
- [x] **ETag caching applied**: `/api/toc`, `/api/stats`, `/api/readability`, `/api/domains/coverage` all return ETag + Cache-Control: public, max-age=60
- [x] **Section count endpoint**: `/api/stats/count` returns `{count: number}` without loading all sections
- [x] **Parallel export**: `export.ts` runs all 4 formats (JSON, Markdown, TXT, CSV) concurrently with `Promise.all()`

### 8.3 OpenAPI & Documentation Sync
- [ ] **Generate TypeScript client** from openapi.yaml using `openapi-typescript` or `orval`
- [ ] **Validate routes against spec**: CI check that every path in `openapi.yaml` has a corresponding route handler

### 8.4 Scheduling & Automation
- [ ] **GitHub Actions workflow**: weekly scrape + verify + publish to GitHub Pages summary
- [ ] **Docker Compose**: containerize GUI + ChromaDB + Ollama for one-command deployment
- [ ] **Health check endpoint monitoring**: expose `/api/health` including disk space, index status, last scrape time

---

## Phase 9 — GUI Enhancements

### 9.1 UI/UX
- [ ] **Error banners**: user-facing error UI for all failed `/api/*` calls (currently fails silently in browser console)
- [ ] **Loading skeletons**: replace spinner with skeleton loaders for section viewer
- [ ] **Section permalink**: copy-to-clipboard button for deep-link URL to a specific section
- [ ] **Print view**: CSS print stylesheet for individual section printing
- [ ] **Keyboard navigation**: arrow keys to navigate TOC, `/` to focus search, `Esc` to clear

### 9.2 Features
- [ ] **Bookmark sections**: local-storage bookmarks list for frequently referenced sections
- [ ] **Side-by-side compare**: select two sections → diff view of text
- [ ] **Section annotation**: allow user notes attached to sections (stored in `localStorage` or `output/notes/`)
- [ ] **Export section**: download a single section as PDF or Markdown from the viewer
- [ ] **Chat history**: persist RAG chat sessions in `output/chat-history/YYYY-MM-DD.jsonl`
- [ ] **Readability overlay**: toggle in TOC to color-code sections by grade level
- [ ] **Coverage overlay**: toggle in TOC to highlight sections cross-referenced by each domain

### 9.3 Performance
- [ ] **Virtual scroll**: TOC tree with 2,486 nodes causes DOM performance issues — implement virtual rendering
- [ ] **Search debounce**: 250ms debounce on search input to reduce unnecessary BM25 re-queries
- [ ] **Section lazy load**: load section text on-demand rather than embedding it all in initial page load

---

## Phase 10 — Data Quality & Freshness

### 10.1 Scrape Freshness
- [ ] **Staleness detection**: if manifest `completedAt` is >30 days old, display warning banner on GUI
- [ ] **Auto-rescrape schedule**: optional flag to trigger full re-scrape when weekly-check detects changes
- [ ] **ecode360 change feed**: monitor ecode360 sitemap.xml or Last-Modified headers to detect upstream updates without full re-scrape
- [ ] **Section diff storage**: when re-scraped section differs from previous, store unified diff at `output/diffs/`

### 10.2 Data Integrity
- [ ] **Cross-reference table validation**: verify all internal section references (`§ X.XX.XXX`) resolve to actual sections in the corpus
- [ ] **Ordinal sequence check**: detect gaps in section numbering within each article (may indicate missing sections)
- [x] **Section length outliers**: `checkSectionLengthOutliers()` in `utils.ts` — flags <25 word (extraction failure) and >5,000 word (concatenation error) sections
- [x] **Unicode normalization**: `normalizeText()` in `utils.ts` — smart quotes, em dashes, NBSP, ellipsis, ligatures → ASCII

### 10.3 Content Enhancement
- [ ] **Legal citation parser**: detect and hyperlink California Code citations (Cal. Gov. Code §, Cal. Health & Safety Code §) in section text
- [ ] **Effective date extraction**: parse "Amended by Ord. No. XXXX" patterns in legislative history → structured date field
- [ ] **Definition extraction**: build a glossary from defined terms in Title 1 (General Provisions) for tooltip hints in the viewer

---

_Last updated: 2026-03-19 · v1.4.0 · 297 tests passing_
