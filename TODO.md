# TODO — Crescent City Municipal Intelligence

> Deeply scoped development and feature backlog. Items are ordered by priority within each phase.
> Status: `[ ]` todo · `[/]` in progress · `[x]` done

---

## Phase 1 — Production Hardening

### 1.1 Rate Limiting
- [x] Replace fixed-window rate limiter with **sliding window algorithm** (timestamp list pruning)
- [x] Support comma-separated `CRESCENT_CITY_API_KEY` list for multiple clients (`reloadApiKeys()`)
- [x] Return `Retry-After` header in 429 responses + `X-RateLimit-Remaining`
- [x] Per-endpoint rate limit overrides (`/api/chat` → 20 req/hr, `/api/summarize` → 20, `/api/analytics/embeddings` → 10)
- [x] Tests in `tests/middleware.test.ts` (7 tests covering bypass, auth, rate limit paths)
- [ ] Write tests that actually exhaust the sliding window to confirm 429 fires (needs test clock override or DI)

### 1.2 Scraper Robustness
- [ ] Detect and log stalled Cloudflare Turnstile (> 10s) with retry suggestion (`CLOUDFLARE_MAX_WAIT_MS`)
- [ ] Retry logic on network error mid-scrape (`RATE_LIMIT_MS * 2` wait, max 3 retries)
- [ ] Detect ecode360 HTTP 503/redirect and bail gracefully with actionable error

### 1.3 Error Boundaries
- [ ] GUI: render user-facing error banner for failed `/api/*` responses (in `static/index.html`)
- [ ] LLM: add `ollama check` pre-flight before `bun run index`

---

## Phase 2 — Search & Query Enhancement

### 2.1 Search Engine
- [x] **BM25** ranking in `src/gui/search.ts` (IDF+TF index, K1=1.5, B=0.75)
- [x] Field position weighting (title 3× boost, number prefix +20)
- [x] `highlight` option returning snippet with `<mark>` tags
- [x] `titleFilter` parameter: `/api/search?q=...&title=8`
- [x] Pagination: `offset` + `limit` in search response + `/api/search` route
- [x] `searchSimple()` backward-compat export
- [x] **Porter stemmer** (`src/shared/porter_stem.ts`) — `tokenizeAndStem`, `queryTerms`, integrated into BM25 index/search
- [x] `typeFilter` option: `/api/search?type=section` vs `type=article`
- [ ] Stemming quality: add known edge-case exceptions for legal compound terms (e.g., "planning" → should not stem to "plan")

### 2.2 RAG Pipeline
- [x] Log RAG queries + answer snippet + latency to `output/rag-queries.jsonl`
- [x] **POST /api/chat** — JSON body `{q, context}` for longer questions without URL length limits
- [ ] Tune `topK` per-query based on estimated complexity
- [ ] Query expansion with CA municipal law synonyms
- [ ] Reranking step (cross-encode top-20 → return top-5)

### 2.3 Structured Query Interface
- [x] `/api/sections?title=8&chapter=04` hierarchical navigation endpoint
- [x] `/api/domain/:id/sections` cross-reference endpoint (domain → code sections)
- [x] `/api/readability` — Flesch-Kincaid grade level distribution for all sections
- [x] `/api/domains/coverage` — domain coverage % endpoint (cached + on-demand)
- [ ] `/api/history?guid=...` legislative history for a section
- [ ] `/api/compare?guid1=...&guid2=...` diff adjacent revisions

---

## Phase 3 — Monitoring Expansion

### 3.1 News Monitor
- [x] Add **KIEM-TV NBC Eureka** RSS feed as 4th news source
- [x] Persistent cross-run dedup via `output/news/seen-ids.json` (URL-normalized, capped 10k)
- [x] `filterKeywords` parameter to `monitorNews()` for on-demand filtering
- [x] `--keywords=` CLI argument to `scripts/run-news.ts`
- [ ] Add Del Norte Triplicate feed when available (no public RSS yet)
- [ ] Sentiment scoring per article (positive/negative/neutral)

### 3.2 Government Meeting Monitor
- [ ] Parse HTML agendas with `@xmldom/xmldom` to extract itemized agenda entries
- [ ] Extract vote records from meeting minutes
- [ ] SHA-256 change detection for meeting documents (persist hash → `output/gov_meetings/seen-hashes.json`)
- [ ] Link agenda items to relevant municipal code sections (keyword match → section lookup)

### 3.3 Municipal Code Change Monitor
- [ ] `--full-rescrape` flag for live re-fetch of all articles (bypass resume)
- [ ] Generate diff report on hash mismatches → `output/monitor-diff.json`
- [x] `/api/monitor/history` endpoint reading `output/monitor-history.jsonl`
- [x] `/api/monitor/alerts` aggregating latest from all alert monitors

---

## Phase 4 — Alert System

- [ ] NOAA tsunami: parse CAP polygon geometry → exact distance from Crescent City harbor
- [ ] NOAA tsunami: persistent dedup with `output/alerts/tsunami/seen-ids.json`
- [ ] USGS: `output/alerts/earthquake/history.jsonl` (append on each run)
- [ ] NWS: coastal flood advisory (CFW) parsing + `output/alerts/weather/history.jsonl`
- [x] `/api/monitor/alerts` endpoint aggregating all 5 alert types (tides, fishing, tsunami, earthquake, weather)

---

## Phase 5 — Intelligence Domains

- [x] Add **Domain 6: Housing & Homelessness** (5 topics: affordable housing, shelter, camping, code enforcement, social services)
- [x] `/api/domain/:id/sections` endpoint with full cross-reference map
- [x] **Domain coverage metric** (`src/domains/coverage.ts`) — % of sections cross-referenced per domain
- [x] `bun run coverage` → `output/domain-coverage.json`
- [x] `/api/domains/coverage` serving cached or on-demand coverage report
- [ ] Expand emergency-management domain with specific tsunami evacuation route section GUIDs
- [ ] Link domain topics to real external Cal OES, FEMA, NWS resource URLs

---

## Phase 6 — Analytics & Reporting

- [x] **Flesch-Kincaid readability scoring** (`src/shared/readability.ts`) — grade level, reading ease, difficulty label
- [x] `bun run readability` → `output/readability.json` (hardest/easiest sections, average grade level)
- [x] `/api/readability` endpoint (cached or on-demand)
- [ ] Track word frequency change over time (multi-version snapshots)
- [ ] Monthly automated civic health report at `output/reports/monthly-YYYY-MM.md`
- [ ] `/api/report/latest` endpoint

---

## Phase 7 — Marine & Harbor Intelligence

- [x] **NOAA CO-OPS tides API** (station 9419750) → `src/alerts/noaa_tides.ts`
- [x] **CDFW Dungeness crab season monitor** → `src/alerts/cdfw_fishing.ts`
- [ ] USCG coastal safety broadcasts (Sector San Francisco/Humboldt Bay govdelivery email → machine-readable polling)
- [ ] PacFIN weekly landing data integration (Crescent City port share)

---

## Phase 8 — Infrastructure

- [x] 60s in-process TTL cache for `loadAllSections()` in `src/shared/data.ts`
- [x] `invalidateSectionsCache()` and `loadAllSectionsCount()` utilities
- [x] `tests/middleware.test.ts` — 7 tests
- [x] `tests/alerts.test.ts` — 13 tests
- [x] `tests/content.test.ts` — 14 tests (htmlToText, Porter stemmer, Flesch-Kincaid)
- [x] `tests/verify.test.ts` — 11 tests (computeSha256, manifest shape, data cache, coverage)
- [x] `scripts/cron-setup.sh` — Launchd (macOS) + cron (Linux) installer
- [x] `openapi.yaml` version bumped to 1.3.0
- [ ] Add new endpoints to openapi.yaml paths (sections, domain/:id/sections, monitor/history, monitor/alerts, readability, domains/coverage, POST /api/chat)
- [ ] Integrate test coverage reporting (`bun test --coverage`) with minimum gate (>60%)
- [ ] Compress large API responses with gzip (Bun.gzipSync for '/api/sections', '/api/readability')

---

## v1.3.0 Completed ✅

_All items below were completed in the v1.3.0 release cycle (2026-03-18):_

- [x] Porter stemmer (`src/shared/porter_stem.ts`) — zero deps, Steps 1a-5b, stemTokens/stemSet exports
- [x] BM25 search: tokenizeAndStem + queryTerms (raw∪stemmed union) for better recall
- [x] `typeFilter` option in search: `?type=section` vs `?type=article`
- [x] POST /api/chat endpoint (JSON body `{q}` for long questions)
- [x] Flesch-Kincaid readability scoring (`src/shared/readability.ts`)
- [x] `bun run readability` + `/api/readability` endpoint
- [x] Domain coverage metrics (`src/domains/coverage.ts`) with prefix matching
- [x] `bun run coverage` + `/api/domains/coverage` endpoint
- [x] `--keywords=` CLI arg for `scripts/run-news.ts`
- [x] `scripts/run-coverage.ts` + `scripts/run-readability.ts` thin orchestrators
- [x] `tests/content.test.ts` — 14 tests (htmlToText, porter stemming, readability)
- [x] `tests/verify.test.ts` — 11 tests (SHA-256, manifest structure, data cache, coverage)
- [x] `openapi.yaml` version → 1.3.0
- [x] `package.json` bumped to 1.3.0; added `coverage`, `readability` commands
- [x] 235 tests · 0 failures · 21 test files

---

## v1.2.0 Completed ✅

_Completed 2026-03-18:_

- [x] True sliding-window rate limiter (per-endpoint limits, multi-key, Retry-After headers)
- [x] BM25 full-text search (IDF+TF index, field boosting, pagination, title filter, highlight)
- [x] RAG query logging to `output/rag-queries.jsonl`
- [x] Housing & Homelessness as Domain 6
- [x] NOAA CO-OPS tides monitor (station 9419750)
- [x] CDFW fishing monitor (crab season + bulletin scraping)
- [x] News monitor: KIEM-TV 4th RSS + persistent seen-ids.json dedup
- [x] New API endpoints: /api/sections, /api/domain/:id/sections, /api/monitor/history, /api/monitor/alerts
- [x] 60s in-process cache for loadAllSections()
- [x] scripts/cron-setup.sh

---

_Last updated: 2026-03-18 · v1.3.0_
