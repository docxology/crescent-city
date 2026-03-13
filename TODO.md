# Crescent City Intelligence Specialization - TODO

## Overall Goal: Build a comprehensive local intelligence system for Crescent City, CA that provides actionable insights on municipal code, emergency management, business development, and community safety.

## Phase 1: Fix Technical Infrastructure (Immediate - Next 2 hours)
- [ ] **Resolve ChromaDB connectivity issues**
  - Kill all existing chroma processes: `pkill -f chroma`
  - Check for port conflicts (especially irdmi on 8000): `lsof -i :8000`
  - Try alternative ports (8002, 8003, etc.) or embedded mode
  - Test connection: `curl -s http://localhost:[PORT]/api/v1/heartbeat` or `/api/v2/heartbeat`
- [ ] **Fix ChromaDB client configuration**
  - Update `src/llm/config.ts` to use correct port or embedded path
  - Ensure `src/llm/chroma.ts` uses proper ChromaClient initialization
  - Test with simple script before full indexing
- [ ] **Verify Ollama is running and models available**
  - Check: `curl -s http://localhost:11434/api/tags`
  - Ensure nomic-embed-text and gemma3:4b are pulled

## Phase 2: Activate RAG System (Next 4 hours)
- [ ] **Run indexing pipeline**
  - Execute: `bun run src/llm/index.ts index`
  - Verify completion with: `bun run src/llm/index.ts status`
  - Target: >400 documents indexed (based on 49 articles, 445 sections)
- [ ] **Test query functionality**
  - Test tsunami-related query: `bun run src/llm/index.ts query "What are the tsunami evacuation requirements?"`
  - Test business license query: `bun run src/llm/index.ts query "What business license requirements exist for food service?"`
  - Test public safety query: `bun run src/llm/index.ts query "What are the noise ordinance restrictions?"`

## Phase 3: Enhance Intelligence Domains (Next 8 hours)
- [ ] **Emergency Management Enhancement**
  - Add tsunami-specific codes, evacuation routes, shelter locations
  - Cross-reference with NOAA tsunami zone maps for Crescent City
  - Add mutual aid agreements with Del Norte County and Pelican Bay
- [ ] **Business Development Enhancement**
  - Add fishing/crabbing regulations (crab seasons, gear restrictions)
  - Add tourism permits (short-term rentals, guided tours)
  - Add marine facility rules (harbor mooring, commercial fishing)
- [ ] **Environmental Protection Enhancement**
  - Add tsunami inundation zone regulations
  - Add coastal erosion control requirements
  - Add wetland and riparian buffer protections
- [ ] **Public Safety Enhancement**
  - Add prison-related regulations (contraband, visitor procedures)
  - Add mutual aid protocols with Pelican Bay State Prison
  - Add emergency communication systems testing requirements
- [ ] **Event Planning Enhancement** (Currently 0 sections - major opportunity)
  - Add mass gathering safety protocols
  - Add tsunami drill/event requirements
  - Add special event permitting for harbor/waterfront events
  - Add noise amplification and crowd control regulations

## Phase 4: Implement Monitoring Systems (Ongoing)
- [ ] **Automated municipal code monitoring**
  - Create script that re-runs scraper weekly and compares hashes
  - Set up GitHub Actions for automated checks (if repo is on GitHub)
  - Create change detection alerts
- [ ] **News monitoring automation**
  - Set up RSS feed parsing for Times-Standard and Lost Coast Outpost
  - Implement keyword filtering (tsunami, emergency, prison, fishing, harbor, etc.)
  - Generate daily summary of relevant articles
- [ ] **Government meeting tracking**
  - Scrape city website for agendas/minutes (city council, planning commission, harbor commission)
  - Extract action items related to intelligence domains
  - Create calendar feed for upcoming meetings
- [ ] **Real-time alert integration**
  - Connect to NOAA tsunami warnings via API
  - Integrate USGS earthquake notifications (Cascadia Subduction Zone relevance)
  - Integrate NWS weather alerts (coastal flooding, high winds)
  - Create alert escalation system with severity levels

## Phase 5: Build Query Interface & Applications (Beyond 8 hours)
- [ ] **Develop specialized query tools**
  - Create natural language interface with domain-specific templates:
    - "What are the requirements for [business type] in the tsunami zone?"
    - "Where are designated evacuation routes from [location]?"
    - "What permits are needed for [activity] near the harbor?"
    - "What are the mutual aid procedures with Pelican Bay for [scenario]?"
  - Export results to CSV/JSON for external use
- [ ] **Create intelligence products**
  - Weekly intelligence brief (template-based)
  - Tsunami preparedness guide for businesses/residents
  - Fishing industry regulatory calendar (seasonal)
  - Emergency contact directory (updated quarterly)
- [ ] **Develop API for external access**
  - REST endpoints for intelligence queries
  - Rate limiting and authentication (API keys)
  - OpenAPI/Swagger documentation
  - Example queries for common use cases

## Phase 6: Establish Ongoing Operations (Beyond immediate scope)
- [ ] **Weekly operations**
  - Run municipal code change detection (Sunday nights)
  - Process news feeds and generate summaries (daily)
  - Update intelligence domains with new information (as needed)
  - Refresh RAG index if code changed (weekly)
- [ ] **Monthly operations**
  - Run economic indicator updates (census, employment, fishing landings)
  - Verify environmental monitoring sources (NOAA, USGS, NWS)
  - Review and update monitoring plan (quarterly)
  - Generate monthly intelligence digest (first Monday)
- [ ] **Quarterly operations**
  - Deep-dive analysis on emerging issues (sea level rise, prison population changes)
  - Stakeholder interviews (harbor master, emergency services, tribal reps, fishing industry)
  - Trend analysis and forecasting (tourism, fishing industry impacts)
  - Methodology review and improvement (incorporate lessons learned)

## Current Status Assessment
Based on work completed:
- ✅ Repository cloned and set up
- ✅ Municipal code scraped: 49 articles, 445 sections captured
- ✅ Domain-specific intelligence files created (Emergency Management, Business Development, Environmental Protection, Public Safety)
- ✅ Monitoring plan established with data sources and update schedules
- ✅ Foundational RAG infrastructure built (needs ChromaDB fix)
- ❌ ChromaDB server not running due to port conflicts/technical issues
- ❌ RAG system not operational (blocked by ChromaDB issue)
- 🔄 Intelligence gathering methodology established

## Next Immediate Actions (Right Now)
1. Kill all chroma processes and resolve port 8000 conflict (irdmi service)
2. Start ChromaDB on working port or use embedded mode
3. Fix ChromaDB client configuration to use embedded or correct HTTP endpoint
4. Run indexing pipeline to verify system works
5. Test basic queries to confirm RAG functionality
6. Update this TODO file with progress

## Progress Tracking
Last updated: $(date)
Current focus: Resolving ChromaDB technical debt to enable RAG system