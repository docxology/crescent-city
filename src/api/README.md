# API Middleware — `src/api/`

HTTP request middleware for the Bun GUI server.

## middleware.ts

Composable middleware chain applied to every request before route handlers.

| Middleware | Behavior |
| :--- | :--- |
| **Request logger** | Logs method, URL, duration (ms) |
| **Rate limiter** | 1 req / 2 s per IP (in-memory; configurable via `RATE_LIMIT_MS`) |
| **API key auth** | Validates `X-API-Key` header or `?api_key=` param |

**Bypass routes** (no rate limit or auth):
- `GET /api/health`
- `GET /api/openapi.yaml`
- `GET /api/swagger`

## Usage

```typescript
// src/gui/server.ts
import { applyMiddleware } from "../api/middleware.js";
const res = await applyMiddleware(req);
if (res !== null) return res;  // short-circuit
```

## Environment

```bash
CRESCENT_CITY_API_KEY=my-secret-key   # override default dev key
RATE_LIMIT_MS=1000                     # stricter rate limiting
```
