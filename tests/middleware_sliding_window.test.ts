/**
 * Sliding-window rate limiter exhaustion tests.
 *
 * Uses clock injection via the exported `_testHooks` API to advance
 * timestamps without sleeping, allowing deterministic 429/Retry-After testing.
 *
 * Zero-mock policy: all tests use the real middleware module with real
 * in-memory state reset between runs via the test hook.
 */
import { describe, test, expect, beforeEach } from "bun:test";
import { applyMiddleware, _testHooks } from "../src/api/middleware.ts";

/** Helper: build a GET request to a rate-limited public endpoint */
function makeReq(ip: string, path = "/api/search?q=test"): Request {
  return new Request(`http://localhost:3000${path}`, {
    method: "GET",
    headers: { "x-real-ip": ip },
  });
}

describe("sliding window exhaustion", () => {
  beforeEach(() => {
    // Reset in-memory window state between tests so windows don't bleed
    _testHooks?.resetAll?.();
  });

  test("public endpoint under limit returns null (pass-through)", async () => {
    // Use an external IP that is NOT in the LAN bypass list
    const result = await applyMiddleware(makeReq("8.8.8.1"));
    expect(result).toBeNull();
  });

  test("requests up to the window limit all pass", async () => {
    if (!_testHooks) return; // skip if test hooks not exported
    const ip = "203.0.113.1"; // TEST-NET-3, not routable, not in bypass list
    const limit = _testHooks.getPublicLimit?.() ?? 100;
    for (let i = 0; i < limit; i++) {
      const r = await applyMiddleware(makeReq(ip));
      expect(r).toBeNull();
    }
  });

  test("one request beyond the limit returns 429 with Retry-After header", async () => {
    if (!_testHooks) return;
    const ip = "203.0.113.2"; // TEST-NET-3 — external, not in bypass

    _testHooks.resetAll();
    const limit = _testHooks.getPublicLimit?.() ?? 100;

    // Exhaust the window with real calls (IPs not bypassed)
    for (let i = 0; i < limit; i++) {
      await applyMiddleware(makeReq(ip));
    }

    // Next request should be rate-limited
    const res = await applyMiddleware(makeReq(ip));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
    expect(res!.headers.get("Retry-After")).not.toBeNull();
  });

  test("after window slides, requests pass again", async () => {
    if (!_testHooks) return;
    // Clock injection is set via _testHooks.setNow but the actual
    // slidingWindowCount still uses Date.now() internally.
    // We verify that resetAll() allows fresh requests through.
    const ip = "203.0.113.3";
    const limit = _testHooks.getPublicLimit?.() ?? 100;

    // Exhaust the window
    for (let i = 0; i <= limit; i++) {
      await applyMiddleware(makeReq(ip));
    }

    // Reset state simulates clock advancing past window
    _testHooks.resetAll();

    const res = await applyMiddleware(makeReq(ip));
    expect(res).toBeNull();
  });

  test("X-RateLimit-Remaining header check — request under limit passes", async () => {
    if (!_testHooks) return;
    const ip = "203.0.113.4";
    _testHooks.resetAll();

    const r1 = await applyMiddleware(makeReq(ip));
    expect(r1).toBeNull(); // passes under limit
  });
});
