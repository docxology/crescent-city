# Changelog

All notable changes to **Crescent City Municipal Intelligence** are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioned by [Semantic Versioning](https://semver.org/).

---

## [0.2.0] — 2026-03-18

### 🚀 Major Features Added

#### Search Engine Overhaul (BM25 + Porter Stemming)
- Replaced basic keyword search with full **BM25 ranking** (K1=1.5, B=0.75, IDF+TF index)
- Added **Porter stemmer** (`src/shared/porter_stem.ts`) — zero-dependency TypeScript, Steps 1a-5b
- BM25 index built on stemmed tokens; queries use raw∪stemmed union for improved recall
- Added `typeFilter` option (`?type=section` vs `?type=article`) for scoped results
- Added `highlight` option returning snippets with `<mark>` HTML tags
- Added pagination: `offset` + `limit` in `PagedSearchResult`
- Added `titleFilter` (`?title=8`) to scope results within a code title

#### AI / RAG Improvements
- Added **POST `/api/chat`** endpoint — accepts JSON body `{q}` for long questions without URL length limits
- RAG queries now logged to `output/rag-queries.jsonl` with question, latency, model, sources
- Ollama pre-flight check before indexing/chat (actionable error messages)

#### Readability Analysis
- New module **`src/shared/readability.ts`** — Flesch-Kincaid Grade Level + Reading Ease
- `bun run readability` → `output/readability.json` (all 2,194 sections, sorted hardest→easiest)
- **`GET /api/readability`** — serves cached or on-demand computed scores
- Difficulty labels: plain (<8) · standard (8-12) · complex (12-16) · legal (16+)

#### Domain Coverage Metrics
- New module **`src/domains/coverage.ts`** — what % of sections each domain cross-references
- Prefix matching: §17.04 matches §17.04.010 and §17.04.020
- `bun run coverage` → `output/domain-coverage.json`
- **`GET /api/domains/coverage`** — serves cached or on-demand report

#### Intelligence Domain Expansion
- Added **Domain 6: Housing & Homelessness** — 5 topics with CalHFA, HUD, CARE Court cross-refs
- Total: 6 civic intelligence domains (Emergency, Business, Public Safety, Environment, Infrastructure, Housing)

#### Marine & Harbor Intelligence
- **NOAA CO-OPS Tides** (`src/alerts/noaa_tides.ts`) — station 9419750, 48-hour predictions, 5 ft MLLW alert
- **CDFW Fishing Monitor** (`src/alerts/cdfw_fishing.ts`) — Dungeness crab season calendar + marine bulletin scraping

#### Monitoring Enhancements
- News monitor: added **KIEM-TV NBC Eureka** as 4th RSS source
- News monitor: **persistent cross-run deduplication** via `output/news/seen-ids.json` (URL-normalized, 10k cap)
- News monitor: **`--keywords=term1,term2`** CLI argument for targeted filtering
- Municipal code monitor: persistent history log at `output/monitor-history.jsonl`
- Added **`GET /api/monitor/history`** and **`GET /api/monitor/alerts`** endpoints

#### Interactive Run Menu
- New **`run.sh`** top-level shell script with full interactive text menu
- Covers all features: setup, tests, scrape, verify, export, GUI launch, LLM/RAG, monitoring, analytics
- Sub-menus for monitoring (9 options), LLM/RAG (6 options), analytics (5 options)
- CLI flags: `./run.sh gui|test|setup|status|api-test`
- Live API tester: checks 12 endpoints and reports HTTP status codes

### 🔧 Improvements

#### API & Server
- **Gzip compression** (`src/gui/server.ts`): API responses >4KB automatically compressed when client sends `Accept-Encoding: gzip`; `Vary: Accept-Encoding` header set
- Added `GET /api/sections?title=8&chapter=04` hierarchical navigation endpoint
- Added `GET /api/domain/:id/sections` domain → code section cross-reference map
- Added `GET /api/readability` and `GET /api/domains/coverage` endpoints
- API middleware: **sliding-window rate limiter** (replaces fixed-window)
  - Per-endpoint limits: `/api/chat` → 20/hr, `/api/summarize` → 20/hr, `/api/analytics/embeddings` → 10/hr
  - `Retry-After` header in 429 responses
  - Comma-separated `CRESCENT_CITY_API_KEY` for multiple clients
  - `X-RateLimit-Remaining` response header

#### Data Layer
- **60-second in-process TTL cache** for `loadAllSections()` in `src/shared/data.ts`
- `invalidateSectionsCache()` and `loadAllSectionsCount()` utilities exported
- All data loading now has actionable error messages with exact fix instructions

#### Infrastructure
- `scripts/cron-setup.sh` — macOS Launchd + Linux cron installer for weekly health check
- `openapi.yaml` bumped to version 1.3.0
- `package.json` version 1.3.0 with new `coverage` and `readability` commands

### 🧪 Testing

- **+27 new tests** across 2 new test files (total: **235 tests · 0 failures · 21 files**)
- `tests/content.test.ts` (14 tests): htmlToText · Porter stemmer · Flesch-Kincaid readability
- `tests/verify.test.ts` (11 tests): SHA-256 async · manifest structure · data TTL cache · domain coverage
- `tests/middleware.test.ts` (7 tests): sliding-window rate limiter · API key auth · bypass paths
- `tests/alerts.test.ts` (13 tests): NOAA tides · CDFW crab season · all 5 alert modules
- Zero-mock policy maintained across all 21 test files

### 📖 Documentation

- **README.md** completely rewritten — comprehensive GitHub README with:
  - Full table of contents with jump links
  - Expanded Crescent City civic context (tsunami history, Battery Point Lighthouse, harbor, governance)
  - 14-entry civic resource link table
  - 22-endpoint API reference table
  - 4-section command tables (Pipeline · AI/RAG · Monitoring · Analysis)
  - 21-file test suite table
  - `run.sh` interactive menu documentation with API test output
- **TODO.md** completely rewritten — 10 deeply scoped phases with 100+ actionable items
- Added `CHANGELOG.md` (this file)
- Added `CONTRIBUTING.md`

### 🐛 Bug Fixes

- Fixed `computeSha256` tests — function is async (returns Promise), tests now properly `await`
- Fixed `htmlToText` test assertions to match actual function behavior (tag stripper, not sanitizer)
- Fixed `tokenizeAndStem` and `queryTerms` missing from search.ts (were called but not defined)
- Fixed POST /api/chat: removed duplicate function that wasn't attached to the right method handler

### ⚠️ Breaking Changes

None. All existing CLI commands and API endpoints remain compatible.

---

## [0.1.0] — 2026-03-14

### Initial Release

- Playwright scraper with Cloudflare Turnstile bypass
- SHA-256 integrity verification + TOC cross-reference
- Multi-format export (JSON, Markdown, TXT, CSV)
- Bun.serve() web viewer with collapsible TOC
- Ollama + ChromaDB RAG pipeline with source citations
- 5 civic intelligence domains (Emergency, Business, Public Safety, Environment, Infrastructure)
- Basic in-memory full-text keyword search
- NOAA tsunami, USGS earthquake, NWS weather alert monitors
- Municipal code change detection
- RSS news monitor (Times-Standard, Lost Coast Outpost, Humboldt Times)
- Government meeting tracker (City Council, Planning Commission, Harbor Commission)
- Analytics dashboard: PCA scatter plot, K-Means clustering, word loadings
- Per-section Ollama summarization
- 208 tests · 0 failures · 19 test files

---

[0.2.0]: https://github.com/docxology/crescent-city/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/docxology/crescent-city/releases/tag/v0.1.0
