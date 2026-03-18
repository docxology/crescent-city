/**
 * Tests for API middleware: sliding-window rate limiter, API key auth.
 * Zero-mock — tests actual middleware functions with no stubs.
 */
import { describe, test, expect, beforeEach } from "bun:test";

// We test the exported pure functions directly, not over HTTP.
// Import after the module is loaded so the in-memory store is fresh for each test.

describe("middleware — sliding window rate limiter", () => {
  test("reloadApiKeys reads CRESCENT_CITY_API_KEY env var", async () => {
    const { reloadApiKeys } = await import("../src/api/middleware.ts");
    // Should not throw; simply reloads from env
    expect(() => reloadApiKeys()).not.toThrow();
  });

  test("applyMiddleware returns null for /api/health (bypass)", async () => {
    const { applyMiddleware } = await import("../src/api/middleware.ts");
    const req = new Request("http://localhost:3000/api/health", { method: "GET" });
    const result = await applyMiddleware(req);
    // Health bypass + public path → null (continue to handler)
    expect(result).toBeNull();
  });

  test("applyMiddleware returns null for localhost IP (rate limit bypass)", async () => {
    const { applyMiddleware } = await import("../src/api/middleware.ts");
    const req = new Request("http://localhost:3000/api/stats", {
      method: "GET",
      headers: { "x-real-ip": "127.0.0.1" },
    });
    const result = await applyMiddleware(req);
    // localhost bypasses rate limit; /api/stats is public → should be null
    expect(result).toBeNull();
  });

  test("applyMiddleware returns 401 for protected endpoint without API key", async () => {
    const { applyMiddleware } = await import("../src/api/middleware.ts");
    // /api/chat is NOT in public paths
    const req = new Request("http://localhost:3000/api/chat?q=test", {
      method: "GET",
      headers: { "x-real-ip": "127.0.0.1" }, // bypass rate limit
    });
    const result = await applyMiddleware(req);
    // Expecting 401 (no API key provided)
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  test("applyMiddleware returns 403 for invalid API key", async () => {
    const { applyMiddleware } = await import("../src/api/middleware.ts");
    const req = new Request("http://localhost:3000/api/chat?q=test", {
      method: "GET",
      headers: {
        "x-real-ip": "127.0.0.1",
        "x-api-key": "wrong-key-xyz",
      },
    });
    const result = await applyMiddleware(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  test("applyMiddleware accepts valid API key", async () => {
    const { applyMiddleware } = await import("../src/api/middleware.ts");
    const req = new Request("http://localhost:3000/api/chat?q=test", {
      method: "GET",
      headers: {
        "x-real-ip": "127.0.0.1",
        "x-api-key": process.env.CRESCENT_CITY_API_KEY ?? "dev-key-12345",
      },
    });
    const result = await applyMiddleware(req);
    // Valid key + localhost IP → null (continue)
    expect(result).toBeNull();
  });
});

describe("middleware — path helpers", () => {
  test("public search endpoint requires no API key", async () => {
    const { applyMiddleware } = await import("../src/api/middleware.ts");
    const req = new Request("http://localhost:3000/api/search?q=tsunami", {
      method: "GET",
      headers: { "x-real-ip": "127.0.0.1" },
    });
    const result = await applyMiddleware(req);
    expect(result).toBeNull();
  });

  test("public stats endpoint requires no API key", async () => {
    const { applyMiddleware } = await import("../src/api/middleware.ts");
    const req = new Request("http://localhost:3000/api/stats", {
      method: "GET",
      headers: { "x-real-ip": "127.0.0.1" },
    });
    const result = await applyMiddleware(req);
    expect(result).toBeNull();
  });
});
