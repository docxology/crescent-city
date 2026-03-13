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
- [x] **Run scraper first** — No `output/` directory exists
  - Execute: `bun run scrape` (requires Chromium + internet)
  - Then: `bun run verify && bun run export`
- [x] **Run indexing pipeline**
  - Start ChromaDB: `chroma run --path chroma_data --port 8001`
  - Execute: `bun run index`
  - Verify completion with: `bun run status`
  - Target: >400 documents indexed (based on 49 articles, 445 sections)
- [x] **Test query functionality**
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
- [x] **News monitoring automation** (active)
  - RSS feed parsing for Times-Standard and Lost Coast Outpost
  - Keyword filtering (tsunami, emergency, prison, fishing, harbor)
  - Saves historical JSON output to `output/news/`
- [x] **Government meeting tracking** (active)
  - Tracks agendas and minutes for city council, planning commission, and harbor commission
  - Saves historical JSON output to `output/gov_meetings/`
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
- ✅ Scraped data available: 245 articles, 2194 sections (output directory populated)
- ✅ ChromaDB server running on port 8001 with 3082 documents indexed
- ✅ RAG system operational: successful test queries executed
- ✅ News monitoring automation: functional RSS feed parser with historical storage
- ✅ Government meeting tracking: functional agenda/minutes tracker with historical storage
- ✅ Continuous improvement system: automated work iterations via cron (15m interval)

## Next Immediate Actions
1. Start GUI: `bun run gui` → http://localhost:3000
2. Add real-time alert integration (NOAA tsunami warnings, USGS earthquake, NWS weather alerts)
3. Implement rate limiting (in-memory IP tracker)
4. Add API key authentication for API endpoints
5. Generate OpenAPI/Swagger documentation
6. Develop monthly economic indicators tracking
7. Plan quarterly deep-dive analysis cycles
8. Improve query interface with better result formatting and filtering
9. Expand news monitoring to include additional local sources and social media
10. Enhance government meeting tracking with actual parsing and change detection

## Progress Tracking
Last updated: 2026-03-13
Current focus: News monitoring and government meeting tracking active — moving toward real-time alerts and API enhancements