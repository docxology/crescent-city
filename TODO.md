# Crescent City Intelligence Specialization - TODO

## Overall Goal: Build a comprehensive local intelligence system for Crescent City, CA that provides actionable insights on municipal code, emergency management, business development, and community safety.

## Current Focus: Real-time Alert Integration & API Enhancements

## Phase 1: Real-time Alert Integration (High Priority)
- [x] **Implement NOAA tsunami warning integration**
  - Subscribes to NOAA CAP alerts for tsunami warnings
  - Parses alert severity, affected areas, and timing
  - Triggers automated notifications via existing monitoring channels
  - Logs alerts to output/alerts/tsunami/ with timestamps
- [x] **Integrate USGS earthquake alerts**
  - Connects to USGS earthquake notification API
  - Filters for earthquakes near Crescent City coast (within 200km, >4.0 magnitude)
  - Extracts location, magnitude, depth, and tsunami potential
  - Stores in output/alerts/earthquake/ with GeoJSON formatting
- [x] **Add NWS weather alert processing**
  - Monitors National Weather Service alerts for coastal flood, high wind, and storm warnings
  - Parses polygon-affected areas for Crescent City specificity
  - Categorizes by severity (advisory, watch, warning)
  - Stores in output/alerts/weather/ with standardized format

## Phase 2: API & Interface Improvements (Medium Priority)
- [ ] **Implement rate limiting**
  - Add in-memory IP tracker with sliding window algorithm
  - Configure limits: 100 requests/hour per IP for API endpoints
  - Return 429 status with retry-after header when exceeded
  - Exclude internal monitoring systems from limits
- [x] **Add API key authentication**
  - Implement optional API key header validation (X-API-Key)
  - Support both header and query parameter authentication
  - Generate and manage API keys via secure storage
  - Log authenticated vs anonymous requests separately
- [x] **Generate OpenAPI/Swagger documentation**
  - Create openapi.yaml defining all API endpoints
  - Include request/response schemas, authentication, and error codes
  - Serve via /api/docs endpoint with Swagger UI
  - Keep documentation synchronized with actual implementation
- [ ] **Enhance query interface with better result formatting**
  - Add structured response metadata (query time, document count, relevance scores)
  - Implement result highlighting for matched terms
  - Add filtering options (date range, document type, source)
  - Support pagination for large result sets

## Phase 3: Monitoring Expansion (Ongoing)
- [ ] **Expand news monitoring sources**
  - Add Humboldt Times, Lost Coast Journal, and local radio station feeds
  - Include social media monitoring (Twitter/X for @CrescentCityCA, @DelNorteSheriff)
  - Implement deduplication across sources
  - Add sentiment analysis for public perception tracking
- [ ] **Enhance government meeting tracking**
  - Implement actual HTML parsing for agenda/minutes extraction
  - Add change detection for updated meeting documents
  - Extract action items, votes, and resolutions from meeting minutes
  - Link to video archives when available
  - Track attendance and public comment topics
- [ ] **Add marine & harbor monitoring**
  - Monitor NOAA tide predictions and current conditions
  - Track harbor entrance conditions and bar restrictions
  - Monitor fishing season openings/closures and crab limits
  - Integrate with Coast Guard marine safety information broadcasts

## Phase 4: Analytics & Reporting (Future)
- [ ] **Develop monthly economic indicators tracking**
  - Automatically extract business license data from municipal code updates
  - Track tourism metrics from lodging tax and visitor information
  - Monitor fishing landing data from state fish and wildlife reports
  - Generate monthly economic dashboard
- [ ] **Plan quarterly deep-dive analysis cycles**
  - Establish rotating focus areas (emergency prep, business climate, env. protection)
  - Create standardized analysis templates and methodologies
  - Schedule public findings presentations and stakeholder feedback
  - Archive analyses in output/analysis/quarterly/
- [ ] **Implement adaptive monitoring frequency**
  - Increase monitoring cadence during emergency situations
  - Reduce frequency during stable periods to conserve resources
  - Trigger based on alert levels, weather conditions, or community events

## Progress Tracking
Last updated: 2026-03-13
Current focus: Implementing real-time alert integration and API enhancements
Completed foundation: Technical infrastructure, RAG system, news monitoring, government meeting tracking
Alert systems completed: NOAA tsunami, USGS earthquake, NWS weather monitoring