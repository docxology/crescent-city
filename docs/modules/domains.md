# Domains Module

## `src/domains.ts` — Intelligence Domain Data

Structured, curated knowledge about Crescent City's key civic domains with cross-references to municipal code sections. Enhances the RAG pipeline with context beyond the raw code text.

### The 5 Domains

| ID | Icon | Name | Topics |
| :--- | :--- | :--- | :--- |
| `emergency-management` | 🌊 | Emergency Management | Tsunami, earthquake, evacuation, mutual aid |
| `business-development` | 🦀 | Business & Economic Development | Fishing, tourism, harbor, permits |
| `public-safety` | 🚔 | Public Safety & Justice | Police, corrections, Pelican Bay |
| `environment-conservation` | 🌲 | Environment & Conservation | Coastal, redwood, wildlife, waste |
| `infrastructure-services` | 🏗️ | Infrastructure & City Services | Utilities, roads, parks, planning |

### Exports

| Export | Signature | Description |
| :--- | :--- | :--- |
| `domains` | `IntelligenceDomain[]` | Array of all 5 domain objects (constant) |
| `getDomainById` | `(id: string) → IntelligenceDomain \| undefined` | Look up by ID slug |
| `getDomainSummaries` | `() → DomainSummary[]` | Lightweight list without full topic data |
| `searchDomains` | `(query: string) → IntelligenceDomain[]` | Full-text search across names, descriptions, tags |

### Interfaces

```typescript
interface IntelligenceDomain {
  id: string;          // kebab-case slug
  name: string;
  description: string;
  icon: string;        // emoji
  topics: DomainTopic[];
  updatedAt: string;   // ISO date
}

interface DomainTopic {
  name: string;
  description: string;
  sources: DomainSource[];   // municipal code cross-refs
  externalRefs?: string[];   // external URLs
  tags: string[];
}

interface DomainSource {
  sectionNumber: string;  // e.g. "§ 8.04.010"
  relevance: string;
}
```

### GUI Integration

Domains are served via the `/api/domains` endpoint and visible in the intelligence panel of the GUI. The `/api/search` endpoint returns relevant domains alongside section results for contextual queries.

### Data Flow

```text
src/domains.ts (static data)
    → GET /api/domains        (routes.ts)
    → GET /api/search         (enriches results)
    → RAG system prompt       (rag.ts context injection)
```

### Tests

```bash
bun test tests/domains.test.ts   # 14 tests
```
