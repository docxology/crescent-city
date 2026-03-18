# API Middleware Module

## `src/api/middleware.ts` — HTTP Request Middleware

Composable middleware chain applied to every GUI server request before route handlers execute. Returns `null` to pass through, or a `Response` to short-circuit.

### Exports

| Export | Signature | Description |
| :--- | :--- | :--- |
| `applyMiddleware` | `(req: Request) → Promise<Response \| null>` | Run full middleware chain; `null` means pass through |

### Middleware Chain

Applied in order:

| Middleware | Behavior |
| :--- | :--- |
| **Request logger** | Logs method, URL path, client IP, response time (ms) |
| **Rate limiter** | Max 1 request per `RATE_LIMIT_MS` (default 2000ms) per client IP. Returns `429 Too Many Requests` on violation. |
| **API key auth** | Validates `X-API-Key` header or `?api_key=` query param against `CRESCENT_CITY_API_KEY`. Returns `401 Unauthorized` on failure. |

### Bypass Routes

The following paths skip rate limiting and API key auth:

- `GET /api/health`
- `GET /api/openapi.yaml`
- `GET /api/swagger`

### Configuration

| Env variable | Default | Description |
| :--- | :--- | :--- |
| `CRESCENT_CITY_API_KEY` | `dev-key-12345` | Valid API key(s) — comma-separated for multiple |
| `RATE_LIMIT_MS` | `2000` | Minimum ms between requests per client IP |

### Integration

```typescript
// src/gui/server.ts
import { applyMiddleware } from "../api/middleware.js";

const server = Bun.serve({
  fetch: async (req) => {
    const middlewareResponse = await applyMiddleware(req);
    if (middlewareResponse !== null) return middlewareResponse;
    // ... route handling
  }
});
```

### Notes

- Rate limit store is **in-memory** — resets on server restart. For production with multiple instances, replace with a Redis-backed store.
- API keys are checked by exact string match. Multiple keys can be provided comma-separated in `CRESCENT_CITY_API_KEY`.
