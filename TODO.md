# Crescent City Intelligence Specialization - TODO

## Overall Goal: Build a comprehensive local intelligence system for Crescent City, CA that provides actionable insights on municipal code, emergency management, business development, and community safety.

## Phase 1: Fix Technical Infrastructure ✅
- [x] **Resolve ChromaDB connectivity issues**
  - Port 8000 occupied by irdmi service on macOS
  - Changed default to port 8001 in `src/llm/config.ts`
  - Use `CHROMA_URL` env var to override: `CHROMA_URL=http://localhost:8002 bun run ...`
  - Test connection: `curl -s http://localhost:8001/api/v1/heartbeat`
- [x] **Fix ChromaDB client configuration**
  - Updated `src/llm/config.ts` to use port 8001 default
  - Added retry logic with `waitForChroma()` in `src/llm/chroma.ts`
  - Added `resetClient()` for restarting after errors
  - Added structured logging to all ChromaDB operations
- [x] **Verify Ollama is running and models available**
  - ✅ Ollama running at localhost:11434
  - ✅ `nomic-embed-text` (embedding model) — available
  - ✅ `gemma3:4b` (chat model) — available

## Phase 2: Activate RAG System (Requires scraped data)
- [ ] **Run scraper first** — No `output/` directory exists
  - Execute: `bun run scrape` (requires Chromium + internet)
  - Then: `bun run verify && bun run export`
- [ ] **Run indexing pipeline**
  - Start ChromaDB: `chroma run --path chroma_data --port 8001`
  - Execute: `bun run index`
  - Verify completion with: `bun run status`
  - Target: >400 documents indexed (based on 49 articles, 445 sections)
- [ ] **Test query functionality**
  - Test tsunami query: `bun run query "What are the tsunami evacuation requirements?"`
  - Test business query: `bun run query "What business license requirements exist for food service?"`
  - Test noise query: `bun run query "What are the noise ordinance restrictions?"`

## Phase 3: Intelligence Domains ✅ (Data layer complete)
- [x] **Emergency Management** — `src/domains.ts`
  - Tsunami preparedness & evacuation (3 topics, 9 cross-refs)
  - Mutual aid agreements (Del Norte County, Pelican Bay)
  - Emergency communication systems
- [x] **Business Development** — `src/domains.ts`
  - Business licenses & permits (4 topics, 12 cross-refs)
  - Fishing & crabbing industry
  - Tourism & short-term rentals
  - Harbor & marine facilities
- [x] **Environmental Protection** — `src/domains.ts`
  - Tsunami inundation zone regulations (3 topics, 9 cross-refs)
  - Coastal erosion & shoreline protection
  - Wetland & riparian protections
- [x] **Public Safety** — `src/domains.ts`
  - Noise ordinances (3 topics, 9 cross-refs)
  - Prison-related regulations (Pelican Bay)
  - Vehicle & traffic safety
- [x] **Event Planning** — `src/domains.ts`
  - Special event permits (4 topics, 7 cross-refs)
  - Waterfront & harbor events
  - Tsunami drills & evacuation exercises
  - Noise & amplification controls

## Phase 4: Monitoring Systems ✅ (Infrastructure complete)
- [x] **Automated municipal code monitoring** — `src/monitor.ts`
  - SHA-256 hash verification of all saved articles
  - Section coverage check (TOC vs. scraped data)
  - JSON report output to `output/monitor-report.json`
  - CLI: `bun run monitor`
- [x] **Weekly check script** — `scripts/weekly-check.sh`
  - Cron-ready shell wrapper with logging
  - Saves results to `output/weekly-check.log`
  - Exit code 1 on detected changes
  - Cron example: `0 2 * * 0 cd /path/to/crescent-city && ./scripts/weekly-check.sh`
- [ ] **News monitoring automation** (future)
  - RSS feed parsing for Times-Standard and Lost Coast Outpost
  - Keyword filtering (tsunami, emergency, prison, fishing, harbor)
- [ ] **Government meeting tracking** (future)
  - City council, planning commission, harbor commission agendas
- [ ] **Real-time alert integration** (future)
  - NOAA tsunami warnings, USGS earthquake, NWS weather alerts

## Phase 5: Query Interface & API ✅ (Endpoints built)
- [x] **Domain query API** — `src/gui/routes.ts`
  - `GET /api/domains` — list all intelligence domains
  - `GET /api/domain/:id` — get domain with topics & cross-refs
  - `GET /api/domains/search?q=...` — search across domains by keyword
  - `GET /api/monitor/status` — last monitoring report
- [x] **Graceful LLM degradation** — GUI works without Ollama/ChromaDB
- [x] **Structured logging** — All API requests logged with timing
- [ ] **Rate limiting** (future) — In-memory IP tracker
- [ ] **API key authentication** (future)
- [ ] **OpenAPI/Swagger docs** (future)

## Phase 6: Ongoing Operations (Automation ready)
- [x] **Weekly check script** — `scripts/weekly-check.sh` (cron-compatible)
- [ ] **Monthly economic indicators** (future)
- [ ] **Quarterly deep-dive analysis** (future)

## Current Status Assessment
- ✅ Structured logging across all modules (`src/logger.ts`)
- ✅ Configurable pipeline constants via env vars (`src/constants.ts`)
- ✅ ChromaDB port conflict resolved (8000 → 8001)
- ✅ ChromaDB retry logic with exponential backoff
- ✅ Fetch timeouts on all Ollama API calls
- ✅ Graceful LLM degradation (GUI starts without Ollama/ChromaDB)
- ✅ Intelligence domains: 5 domains, 17 topics, 46 cross-references
- ✅ Change detection monitor with SHA-256 verification
- ✅ Weekly check automation script
- ✅ 4 new API endpoints for domains and monitoring
- ✅ 135 tests passing across 15 files
- ❌ No scraped data yet — run `bun run scrape` (requires Chromium)
- ❌ ChromaDB server needs to be started manually
- ❌ RAG system not yet operational (blocked on scraping + ChromaDB startup)

## Next Immediate Actions
1. Start ChromaDB: `chroma run --path chroma_data --port 8001`
2. Scrape municipal code: `bun run scrape`
3. Verify + export: `bun run verify && bun run export`
4. Index for RAG: `bun run index`
5. Test queries: `bun run query "What are the tsunami evacuation requirements?"`
6. Start GUI: `bun run gui` → http://localhost:3000

## Progress Tracking
Last updated: 2026-03-13
Current focus: Infrastructure complete — awaiting scrape + ChromaDB startup for full RAG activation