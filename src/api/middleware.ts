/**
 * API middleware: sliding-window rate limiting, multi-key auth, request logging.
 *
 * Rate limiting uses a **sliding window** algorithm: each IP stores a list of
 * request timestamps within the current window. Old timestamps are pruned on
 * every check, so the window truly slides rather than resetting in a block.
 */
import { createLogger } from "../logger.js";
import { appendFile } from "fs/promises";

const logger = createLogger("api-middleware");

// ─── Configuration ────────────────────────────────────────────────

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour sliding window
const RATE_LIMIT_MAX_REQUESTS = 100; // per IP per window

/** Stricter per-endpoint limits. Key = path prefix, value = max requests per window. */
const ENDPOINT_LIMITS: Record<string, number> = {
  "/api/chat": 20,
  "/api/summarize": 20,
  "/api/analytics/embeddings": 10,
};

/** Paths exempt from rate limiting (health, monitoring, static assets). */
const BYPASS_PATHS = ["/api/health", "/api/monitor/status", "/api/openapi.yaml"];

/** Paths that are public (no API key required). */
const PUBLIC_PATHS = [
  "/api/health",
  "/api/stats",
  "/api/toc",
  "/api/domains",
  "/api/search",
  "/api/sections",
  "/api/openapi.yaml",
  "/api/docs",
];

// ─── API Key Store ────────────────────────────────────────────────

function buildValidKeySet(): Set<string> {
  const raw = process.env.CRESCENT_CITY_API_KEY ?? "dev-key-12345";
  return new Set(raw.split(",").map(k => k.trim()).filter(Boolean));
}

let VALID_API_KEYS = buildValidKeySet();

/** Reload API keys from env (for hot-reload scenarios). */
export function reloadApiKeys(): void {
  VALID_API_KEYS = buildValidKeySet();
}

// ─── Sliding Window Store ─────────────────────────────────────────

/** Map of IP → sorted array of request timestamps within the current window. */
const rateLimitStore = new Map<string, number[]>();

/** Prune + count requests in the sliding window. Returns current count after pruning. */
function slidingWindowCount(ip: string, now: number): number {
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (rateLimitStore.get(ip) ?? []).filter(t => t > windowStart);
  timestamps.push(now);
  rateLimitStore.set(ip, timestamps);
  return timestamps.length;
}

/** Seconds until the oldest request in the window expires. */
function retryAfterSeconds(ip: string, now: number): number {
  const timestamps = rateLimitStore.get(ip) ?? [];
  if (timestamps.length === 0) return 0;
  const oldest = timestamps[0];
  return Math.max(1, Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000));
}

/** Get the effective max-requests for a path. */
function effectiveLimit(path: string): number {
  for (const [prefix, limit] of Object.entries(ENDPOINT_LIMITS)) {
    if (path.startsWith(prefix)) return limit;
  }
  return RATE_LIMIT_MAX_REQUESTS;
}

// ─── Request log ─────────────────────────────────────────────────

const REQUEST_LOG_PATH = "output/request-log.jsonl";

async function logRequest(
  method: string,
  path: string,
  ip: string,
  status: number,
  ms: number
): Promise<void> {
  const entry = JSON.stringify({ ts: new Date().toISOString(), method, path, ip, status, ms });
  try {
    await appendFile(REQUEST_LOG_PATH, entry + "\n");
  } catch {
    // Non-fatal — output dir may not exist before first scrape
  }
}

// ─── Middleware functions ─────────────────────────────────────────

/** Rate limiting with sliding window algorithm. */
export function rateLimitMiddleware() {
  return async (req: Request): Promise<Response | null> => {
    const path = new URL(req.url).pathname;

    // Bypass list
    if (BYPASS_PATHS.some(p => path.startsWith(p))) return null;

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    // Skip for loopback / LAN
    if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
      return null;
    }

    const now = Date.now();
    const limit = effectiveLimit(path);
    const count = slidingWindowCount(ip, now);
    const remaining = Math.max(0, limit - count);

    if (count > limit) {
      const retryAfter = retryAfterSeconds(ip, now);
      logger.warn(`Rate limit exceeded for ${ip} on ${path}`, { count, limit, retryAfter });
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          message: `Too many requests. Try again in ${retryAfter} seconds.`,
          limit,
          remaining: 0,
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": "0",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Attach rate-limit headers for use in route handlers via a custom request header
    // (We can't mutate the original Request, so we signal via a sentinel value)
    req.headers.set?.("x-ratelimit-remaining", String(remaining));
    return null;
  };
}

/** API key authentication middleware. */
export function apiKeyMiddleware() {
  return async (req: Request): Promise<Response | null> => {
    const path = new URL(req.url).pathname;
    if (PUBLIC_PATHS.some(p => path.startsWith(p))) return null;

    const apiKey =
      req.headers.get("x-api-key") ??
      new URL(req.url).searchParams.get("api_key");

    if (!apiKey) {
      logger.warn(`Missing API key for ${path}`);
      return new Response(
        JSON.stringify({ error: "API key required", message: "Provide key via X-API-Key header or api_key param" }),
        { status: 401, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    if (!VALID_API_KEYS.has(apiKey)) {
      logger.warn(`Invalid API key attempt: ${apiKey.substring(0, 8)}...`);
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 403, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    logger.debug(`Valid API key used for ${path}`);
    return null;
  };
}

/** Request logging middleware — logs method, path, IP, timing. */
export function requestLoggingMiddleware() {
  const starts = new Map<string, number>();

  return async (req: Request): Promise<Response | null> => {
    const url = new URL(req.url);
    const method = req.method;
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "local";

    const key = `${method}:${url.pathname}:${Date.now()}`;
    starts.set(key, Date.now());

    logger.info(`${method} ${url.pathname}`, { ip, ua: req.headers.get("user-agent")?.substring(0, 60) });

    // Log asynchronously after the next event-loop tick (non-blocking)
    const ms = 0; // We can't measure duration here (before handler runs); log with 0
    void logRequest(method, url.pathname, ip, 0, ms);
    return null;
  };
}

/**
 * Apply all middleware in order.
 * Returns a Response if any middleware short-circuits (rate limit / auth),
 * or null to continue to the route handler.
 */
export async function applyMiddleware(req: Request): Promise<Response | null> {
  for (const fn of [requestLoggingMiddleware, rateLimitMiddleware, apiKeyMiddleware]) {
    const result = await fn()(req);
    if (result !== null) return result;
  }
  return null;
}