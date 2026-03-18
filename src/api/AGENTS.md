# Agents Guide — `src/api/`

## Overview

HTTP request middleware for the GUI server. Provides rate limiting, API key authentication, and structured request logging as composable middleware functions.

## Convention

- Middleware functions accept `Request` and return `Response | null`.
- `null` means "pass through" (continue to next middleware or route handler).
- Non-null `Response` means "short-circuit" (return immediately without calling routes).
- The `applyMiddleware(req)` orchestrator chains all middleware in order.
- No external dependencies — pure logic only.

## Modules

| File | Purpose | Tests |
| :--- | :--- | :--- |
| `middleware.ts` | Rate limiting + API key auth + request logging | No |

## Public API

```typescript
import { applyMiddleware } from "../api/middleware.js";

// In Bun.serve() fetch handler:
const middlewareResponse = await applyMiddleware(req);
if (middlewareResponse !== null) return middlewareResponse;
// ... continue to route handling
```

## Configuration

| Env variable | Default | Description |
| :--- | :--- | :--- |
| `CRESCENT_CITY_API_KEY` | `dev-key-12345` | Valid API key (comma-separated for multiple) |
| `RATE_LIMIT_MS` | `2000` | Minimum ms between requests per IP |

## Key Patterns

- **Skip list**: `/api/health`, `/api/openapi.yaml`, `/api/swagger` bypass both rate limiting and auth.
- **In-memory rate limit store**: keyed by client IP. Resets on server restart. For production, replace with Redis.
- **API key sources**: checked in `X-API-Key` header first, then `?api_key=` query parameter.
