/**
 * API middleware for rate limiting, authentication, and request logging
 */
import { createLogger } from "../logger.js";

const logger = createLogger("api-middleware");

// In-memory store for rate limiting (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per hour per IP

// API keys (in production, store these securely and load from environment/vault)
const VALID_API_KEYS = new Set([
  // Add your API keys here or load from environment
  process.env.CRESCENT_CITY_API_KEY || "dev-key-12345"
]);

/**
 * Rate limiting middleware
 */
export function rateLimitMiddleware() {
  return async (req: Request) => {
    // Skip rate limiting for health checks and internal monitoring
    if (req.url.includes("/api/health") || req.url.includes("/api/monitor")) {
      return null;
    }

    // Get client IP (simple implementation - in production handle proxies properly)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
               req.headers.get("x-real-ip") ||
               "unknown";

    // Skip rate limiting for localhost/internal IPs in development
    if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
      return null;
    }

    const now = Date.now();
    const record = rateLimitStore.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

    // Reset if window has passed
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + RATE_LIMIT_WINDOW_MS;
    }

    // Increment counter
    record.count++;

    // Store back
    rateLimitStore.set(ip, record);

    // Check if limit exceeded
    if (record.count > RATE_LIMIT_MAX_REQUESTS) {
      const resetInSeconds = Math.ceil((record.resetTime - now) / 1000);
      logger.warn(`Rate limit exceeded for IP ${ip}`, {
        count: record.count,
        limit: RATE_LIMIT_MAX_REQUESTS,
        resetInSeconds
      });

      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          message: `Too many requests. Try again in ${resetInSeconds} seconds.`,
          limit: RATE_LIMIT_MAX_REQUESTS,
          resetIn: `${resetInSeconds} seconds`
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(resetInSeconds),
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }

    // Add rate limit info to headers for successful requests
    const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - record.count);

    // We can't modify the response directly here, but we'll return info that handlers can use
    return {
      rateLimitInfo: {
        limit: RATE_LIMIT_MAX_REQUESTS,
        remaining,
        reset: new Date(record.resetTime).toISOString()
      }
    };
  };
}

/**
 * API key authentication middleware
 */
export function apiKeyMiddleware() {
  return async (req: Request) => {
    // Skip auth for health checks and public endpoints
    const publicPaths = [
      "/api/health",
      "/api/stats",
      "/api/toc",
      "/api/domains",
      "/api/search"
    ];

    const path = new URL(req.url).pathname;
    if (publicPaths.some(publicPath => path.startsWith(publicPath))) {
      return null;
    }

    // Check for API key in header
    const apiKey = req.headers.get("x-api-key");
    // Also check query parameter as fallback
    const queryApiKey = new URL(req.url).searchParams.get("api_key");
    const keyToCheck = apiKey || queryApiKey;

    if (!keyToCheck) {
      logger.warn(`Missing API key for request to ${path}`);
      return new Response(
        JSON.stringify({
          error: "API key required",
          message: "Please provide an API key via X-API-Key header or api_key query parameter"
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }

    if (!VALID_API_KEYS.has(keyToCheck)) {
      logger.warn(`Invalid API key attempt: ${keyToCheck.substring(0, 8)}...`);
      return new Response(
        JSON.stringify({
          error: "Invalid API key",
          message: "The provided API key is not valid"
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }

    logger.debug(`Valid API key used for ${path}`);
    return null; // Auth successful
  };
}

/**
 * Request logging middleware
 */
export function requestLoggingMiddleware() {
  return async (req: Request) => {
    const start = Date.now();
    const url = new URL(req.url);
    const method = req.method;

    // Log request
    logger.info(`${method} ${url.pathname}`, {
      ip: req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
            req.headers.get("x-real-ip") ||
            "unknown",
      userAgent: req.headers.get("user-agent")
    });

    // Return null to continue processing
    return null;
  };
}

/**
 * Apply all middleware in order
 */
export async function applyMiddleware(req: Request): Promise<Response | null> {
  const middlewares = [
    requestLoggingMiddleware(),
    rateLimitMiddleware(),
    apiKeyMiddleware()
  ];

  for (const middleware of middlewares) {
    const result = await middleware(req);
    if (result !== null) {
      // If middleware returned a response, send it immediately
      if (typeof result === "object" && result !== null && "rateLimitInfo" in result) {
        // Special case for rate limit info - we'll handle this in the route handler
        continue;
      }
      return result as Response;
    }
  }

  return null; // Continue to route handler
}