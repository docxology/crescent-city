# TODO — Crescent City Municipal Intelligence

> Deeply scoped development and feature backlog for the Crescent City, CA civic intelligence system.
> Covers all pipeline stages: scraping, verification, export, GUI, LLM/RAG, monitoring, alerts, and analytics.
>
> **Status**: `[ ]` todo · `[/]` in progress · `[x]` done
> **Current version**: v1.3.0 · **Tests**: 235 pass · 0 fail · 21 files
>
> Jump to: [Phase 1](#phase-1--production-hardening) · [Phase 2](#phase-2--search--query-enhancement) · [Phase 3](#phase-3--monitoring-expansion) · [Phase 4](#phase-4--alert-system) · [Phase 5](#phase-5--intelligence-domains) · [Phase 6](#phase-6--analytics--reporting) · [Phase 7](#phase-7--marine--harbor-intelligence) · [Phase 8](#phase-8--infrastructure) · [Phase 9](#phase-9--gui-enhancements) · [Phase 10](#phase-10--data-quality--freshness) · [Completed](#completed)

---

## Phase 1 — Production Hardening

### 1.1 Rate Limiting
- [x] Replace fixed-window rate limiter with **sliding window algorithm** (timestamp list pruning)
- [x] Support comma-separated `CRESCENT_CITY_API_KEY` for multiple clients (`reloadApiKeys()`)
- [x] Return `Retry-After` header in 429 responses + `X-RateLimit-Remaining`
- [x] Per-endpoint rate limit overrides (chat/summarize → 20/hr, embeddings → 10/hr)
- [x] Tests in `tests/middleware.test.ts` (7 tests: bypass, auth, rate limit paths)
- [ ] **Test clock injection**: write test that actually exhausts the sliding window and confirms 429 fires (requires DI or fake Date.now)
- [ ] Add rate limit metric to `/api/health` (current usage per-IP, peak, blocked count)

### 1.2 Scraper Robustness
- [ ] **Cloudflare stall detection**: detect Turnstile challenge stuck >10s → log suggestion to retry with `CLOUDFLARE_MAX_WAIT_MS` env var
- [ ] **Network error retry**: exponential backoff on `fetch` errors mid-scrape (`RATE_LIMIT_MS * 2`, max 3 retries per article)
- [ ] **HTTP 503/redirect detection**: detect ecode360.com maintenance mode or redirect → bail gracefully with actionable error
- [ ] **Progress bar**: live terminal progress indicator showing scraped/total/failed counts
- [ ] **Scrape metrics**: record per-article timing in manifest for performance analysis

### 1.3 Error Boundaries
- [ ] **GUI error banner**: render user-facing error UI for failed `/api/*` responses in `static/index.html` (currently fails silently)
- [ ] **Ollama preflight**: add `ollama check` before `bun run index` — fail fast with install instructions if not running
- [ ] **ChromaDB preflight**: check collection exists before RAG query; better error message if empty
- [ ] **Port conflict**: detect port 3000 already in use and suggest `PORT=3001 bun run gui`

---

## Phase 2 — Search & Query Enhancement

### 2.1 Search Engine
- [x] **BM25** ranking (IDF+TF index, K1=1.5, B=0.75)
- [x] Field position weighting (title 3× boost, number prefix +20)
- [x] `highlight` option returning snippets with `<mark>` tags
- [x] `titleFilter` parameter (`?title=8` scopes to Title 8 sections)
- [x] Pagination (`offset` + `limit`) → `PagedSearchResult`
- [x] `searchSimple()` backward-compat export
- [x] **Porter stemmer** (`src/shared/porter_stem.ts`) — Steps 1a-5b, zero deps
- [x] `typeFilter` option (`?type=section` vs `?type=article`)
- [ ] **Stemmer exceptions**: legal compound terms that should NOT be stemmed (e.g., "planning" ≠ "plan" in zoning context)
- [ ] **Stop words**: filter common legal stop words ("the", "shall", "of") from index to reduce noise
- [ ] **Synonym expansion**: CA municipal law synonyms (e.g., "parcel" → "lot", "structure" → "building")
- [ ] **Fuzzy matching**: Levenshtein distance for typo-tolerant queries ("harbr" → "harbor")
- [ ] **Field-level search**: `?field=number` to search only section numbers

### 2.2 RAG Pipeline
- [x] Log RAG queries + answer snippet + latency to `output/rag-queries.jsonl`
- [x] **POST /api/chat** — JSON body `{q, context}` for long questions
- [ ] **Adaptive topK**: tune retrieval count based on estimated query complexity (short/specific → top-5, broad → top-15)
- [ ] **Query expansion**: expand with CA municipal law synonyms before embedding
- [ ] **Reranking**: cross-encode top-20 retrieved chunks → return top-5 (better precision)
- [ ] **Conversation history**: support multi-turn chat with context window management
- [ ] **Citation format**: improve source citations to include direct ecode360 deep-links
- [ ] **Model selection**: `/api/chat?model=llama3:8b` to override default model per request
- [ ] **Streaming response**: Server-Sent Events for word-by-word streaming of RAG answers

### 2.3 Structured Query Interface
- [x] `/api/sections?title=8&chapter=04` hierarchical navigation endpoint
- [x] `/api/domain/:id/sections` domain → code section cross-reference
- [x] `/api/readability` Flesch-Kincaid grade level distribution
- [x] `/api/domains/coverage` domain coverage % report
- [ ] `/api/history?guid=...` legislative history for a specific section (ordinance chain)
- [ ] `/api/compare?guid1=...&guid2=...` diff two sections or revisions
- [ ] `/api/similar?guid=...` find semantically similar sections using ChromaDB
- [ ] `/api/toc/breadcrumb?guid=...` return the title → chapter → article → section path

---

## Phase 3 — Monitoring Expansion

### 3.1 News Monitor
- [x] KIEM-TV NBC Eureka as 4th RSS source
- [x] Persistent cross-run dedup via `output/news/seen-ids.json` (URL-normalized, 10k cap)
- [x] `filterKeywords` parameter + `--keywords=` CLI arg
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
- [x] `/api/monitor/history` endpoint from `output/monitor-history.jsonl`
- [x] `/api/monitor/alerts` aggregating latest from all 5 alert monitors
- [ ] **Version snapshots**: archive a full JSON snapshot on each change detection run for historical diff comparison
- [ ] **Change notification**: webhook/email notification when municipal code changes detected

---

## Phase 4 — Alert System

### 4.1 Tsunami Alerts (NOAA)
- [x] NOAA CAP API (`api.weather.gov/alerts`) for Tsunami Warning events
- [ ] **CAP polygon geometry**: parse `geometry.coordinates` from CAP GeoJSON → compute exact distance from Crescent City harbor (41.745°N, 124.184°W) using Haversine
- [ ] **Persistent alert dedup**: `output/alerts/tsunami/seen-ids.json` to prevent re-processing same CAP alert across runs
- [ ] **Alert history JSONL**: `output/alerts/tsunami/history.jsonl` with timestamp, event, severity, distance
- [ ] **Evacuation route section lookup**: when tsunami alert fires, automatically surface relevant code sections (shelter, EOC, mutual aid)
- [ ] **False positive handling**: distinguish "Watch" vs "Warning" vs "Advisory" severity levels

### 4.2 Earthquake Alerts (USGS)
- [x] USGS GeoJSON feed → M4.0+ within 200 km of Crescent City
- [ ] **Alert history JSONL**: `output/alerts/earthquake/history.jsonl` (timestamp, mag, depth, distance, Cascadia flag)
- [ ] **Cascadia tracking**: specific flag when epicenter matches Cascadia Subduction Zone geometry
- [ ] **Tsunami potential scoring**: cross-reference USGS `alert` field (green/yellow/orange/red) with tsunami potential
- [ ] **Aftershock sequence**: detect aftershock swarms (>3 events in 24h) and summarize

### 4.3 Weather Alerts (NWS)
- [x] NWS Eureka office, zone CAZ006 coastal alerts
- [ ] **Alert history JSONL**: `output/alerts/weather/history.jsonl`
- [ ] **Coastal flood advisory (CFW)** parsing: extract predicted surge height, timing, affected beaches
- [ ] **High wind advisory**: track sustained wind + gust values for harbor operations
- [ ] **Storm track overlay**: map NWS storm track to harbor exposure geometry

### 4.4 Alert Aggregation
- [x] `/api/monitor/alerts` endpoint aggregating all 5 alert types
- [ ] **Alert severity scoring**: composite score across all 5 active monitors → `CALM / WATCH / WARNING / EMERGENCY`
- [ ] **Alert dashboard widget**: GUI panel showing current composite status with last-updated timestamp
- [ ] **Alert history comparison**: diff consecutive alert runs to detect new vs cleared events

---

## Phase 5 — Intelligence Domains

### 5.1 Existing Domains
- [x] Domain 1: Emergency Management (tsunami, earthquake, EOC, mutual aid)
- [x] Domain 2: Business & Economic Development (harbor, fishing, licenses)
- [x] Domain 3: Public Safety & Justice (police, Pelican Bay, corrections)
- [x] Domain 4: Environment & Conservation (coastal zone, redwoods, waste)
- [x] Domain 5: Infrastructure & Services (utilities, roads, zoning)
- [x] Domain 6: Housing & Homelessness (affordable housing, shelter, CARE Court)

### 5.2 New Domains
- [ ] **Domain 7: Tourism & Recreation** — parks, camping permits, beach access, fishing charters, Battery Point Lighthouse tours, vacation rentals
- [ ] **Domain 8: Harbor & Marine Operations** — docking fees, vessel registration, slip assignments, dredging permits, fuel dock regulations
- [ ] **Domain 9: Education & Youth** — school zone regulations, youth program permits, library, parks & rec facility use

### 5.3 Coverage & Quality
- [x] Domain coverage metrics (`src/domains/coverage.ts`) — % of sections cross-referenced
- [x] `bun run coverage` + `/api/domains/coverage`
- [ ] **Expand Emergency domain**: add specific tsunami evacuation route section GUIDs (Title 8 + Title 12 coastal access)
- [ ] **External resource validation**: verify all external URLs in domain definitions return 200 (link checker)
- [ ] **Topic search within domain**: `/api/domain/:id/search?q=...` scopes BM25 to domain's sections
- [ ] **Domain summary auto-generation**: use Ollama to generate a 2-paragraph plain-English summary per domain

---

## Phase 6 — Analytics & Reporting

### 6.1 Readability
- [x] **Flesch-Kincaid** Grade Level + Reading Ease (`src/shared/readability.ts`)
- [x] `bun run readability` + `/api/readability`
- [ ] **Gunning Fog Index**: add as second readability metric for comparison
- [ ] **Readability trend**: compare section readability across ordinance amendment dates (requires historical data)
- [ ] **Plain-language rewrite suggestions**: use Ollama to draft simplified versions of high-grade-level sections

### 6.2 Automated Reporting
- [ ] **Monthly civic health report**: auto-generate `output/reports/monthly-YYYY-MM.md` summarizing:
  - New/changed code sections
  - Alert events (tsunami, earthquake, weather, tides)
  - News highlights
  - Meeting summaries
  - Domain coverage changes
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
- [x] **NOAA CO-OPS tides API** (station 9419750) — 48h predictions, current level, 5 ft alert
- [x] **CDFW Dungeness crab season** — regulatory calendar + CDFW marine bulletin scraping
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
- [x] `tests/middleware.test.ts` (7 tests)
- [x] `tests/alerts.test.ts` (13 tests)
- [x] `tests/content.test.ts` (14 tests — htmlToText, Porter stemmer, readability)
- [x] `tests/verify.test.ts` (11 tests — SHA-256, manifest, cache, coverage)
- [ ] **`tests/browser.test.ts`**: Playwright error handling — page timeout, dead page detection, retry behavior
- [ ] **`tests/content-fixture.test.ts`**: section extraction from fixture HTML strings (no live browser needed)
- [ ] **`tests/routes.integration.test.ts`**: start a real Bun.serve() instance and hit `/api/search`, `/api/toc`, `/api/stats` with `fetch`
- [ ] **Sliding window exhaustion test**: inject fake timestamps into rate limiter to confirm 429 fires correctly
- [ ] **Coverage gate**: integrate `bun test --coverage` with minimum coverage threshold (target: 60%)

### 8.2 Performance
- [ ] **Gzip compression**: compress `/api/sections`, `/api/readability`, `/api/toc` responses >4KB using `Bun.gzipSync`
- [ ] **ETag caching**: add `ETag` + `If-None-Match` headers for static API responses (toc, readability, coverage)
- [ ] **Section count endpoint**: `/api/stats/count` that returns just a number (avoids loading all sections for health checks)
- [ ] **Parallel export**: export JSON/Markdown/TXT/CSV concurrently instead of sequentially

### 8.3 OpenAPI & Documentation Sync
- [x] `openapi.yaml` version → 1.3.0
- [ ] **Add new endpoints to openapi.yaml paths**: `/api/sections`, `/api/domain/:id/sections`, `/api/monitor/history`, `/api/monitor/alerts`, `/api/readability`, `/api/domains/coverage`, `POST /api/chat`
- [ ] **Generate TypeScript client** from openapi.yaml using `openapi-typescript` or `orval`
- [ ] **Validate routes against spec**: CI check that every path in `openapi.yaml` has a corresponding route handler

### 8.4 Scheduling & Automation
- [x] `scripts/cron-setup.sh` — macOS Launchd + Linux cron installer
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
- [ ] **Section length outliers**: flag sections with <25 words (possible extraction failures) or >5,000 words (possible concatenation errors)
- [ ] **Unicode normalization**: normalize smart quotes, em-dashes, non-breaking spaces in scraped text

### 10.3 Content Enhancement
- [ ] **Legal citation parser**: detect and hyperlink California Code citations (Cal. Gov. Code §, Cal. Health & Safety Code §) in section text
- [ ] **Effective date extraction**: parse "Amended by Ord. No. XXXX" patterns in legislative history → structured date field
- [ ] **Definition extraction**: build a glossary from defined terms in Title 1 (General Provisions) for tooltip hints in the viewer

---

## Completed

### v1.3.0 (2026-03-18)

- [x] Porter stemmer (`src/shared/porter_stem.ts`) — zero deps, Steps 1a-5b
- [x] BM25 search with `tokenizeAndStem` + `queryTerms` (raw∪stemmed union for recall)
- [x] `typeFilter` option in search (`?type=section` vs `?type=article`)
- [x] POST `/api/chat` endpoint (JSON body `{q}` for long questions)
- [x] Flesch-Kincaid readability scoring (`src/shared/readability.ts`)
- [x] `bun run readability` + `/api/readability`
- [x] Domain coverage metrics (`src/domains/coverage.ts`) — prefix matching
- [x] `bun run coverage` + `/api/domains/coverage`
- [x] `--keywords=` CLI arg for `scripts/run-news.ts`
- [x] `scripts/run-coverage.ts` + `scripts/run-readability.ts` orchestrators
- [x] `tests/content.test.ts` (14 tests) + `tests/verify.test.ts` (11 tests)
- [x] `openapi.yaml` → v1.3.0; `package.json` → v1.3.0

### v1.2.0 (2026-03-18)

- [x] Sliding-window rate limiter (per-endpoint limits, multi-key, Retry-After headers)
- [x] BM25 full-text search (IDF+TF index, field boosting, pagination, title filter, highlight)
- [x] RAG query logging to `output/rag-queries.jsonl`
- [x] Housing & Homelessness as Domain 6 (5 topics, CalHFA/HUD/CARE Court refs)
- [x] NOAA CO-OPS tides monitor (station 9419750)
- [x] CDFW fishing monitor (crab season calendar + bulletin scraping)
- [x] News monitor: KIEM-TV 4th RSS + persistent seen-ids.json
- [x] New routes: `/api/sections`, `/api/domain/:id/sections`, `/api/monitor/history`, `/api/monitor/alerts`
- [x] 60s in-process TTL cache for `loadAllSections()` + `invalidateSectionsCache()`
- [x] `scripts/cron-setup.sh` (macOS Launchd + Linux cron)
- [x] 208 tests → 0 failures

---

_Last updated: 2026-03-18 · v1.3.0 · 235 tests passing_
