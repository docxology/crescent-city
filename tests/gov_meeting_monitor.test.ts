/**
 * Tests for gov_meeting_monitor.ts
 *
 * Tests the pure-logic aspects:
 * - Network error handling (graceful [] return)
 * - saveMeetingItems contract (writes to disk in correct shape)
 * - monitorGovMeetings overall execution path
 */
import { describe, expect, test } from "bun:test";
import { fetchGovMeetings, saveMeetingItems } from "../src/gov_meeting_monitor";
import { existsSync } from "fs";
import { readdir, readFile, rm } from "fs/promises";
import { join } from "path";

describe("fetchGovMeetings", () => {
  test("returns empty array when URL is unreachable", async () => {
    const result = await fetchGovMeetings("http://localhost:0/nonexistent", "TestSource");
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  test("returns empty array on HTTP 404", async () => {
    const result = await fetchGovMeetings("https://httpbin.org/status/404", "TestSource");
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});

describe("saveMeetingItems", () => {
  test("creates a JSON file in output/gov_meetings/ with correct structure", async () => {
    const testItems = [
      {
        title: "City Council Meeting - March 2026",
        link: "https://crescentcity.org/agendas/cc-mar-2026.pdf",
        date: "Mar 18, 2026",
        content: "Agenda for the March 2026 city council meeting.",
        source: "City Council",
        fetchedAt: new Date().toISOString(),
        isNew: true,
        changed: true,
      },
    ];

    await saveMeetingItems(testItems);

    const dir = join(process.cwd(), "output", "gov_meetings");
    expect(existsSync(dir)).toBe(true);

    const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThanOrEqual(1);

    // Read the most recently written file and verify shape
    const latest = files.sort().at(-1)!;
    const raw = await readFile(join(dir, latest), "utf-8");
    const parsed = JSON.parse(raw);

    expect(parsed).toHaveProperty("fetchedAt");
    expect(parsed).toHaveProperty("totalItems");
    expect(parsed).toHaveProperty("items");
    expect(Array.isArray(parsed.items)).toBe(true);
    expect(parsed.items[0].title).toBe("City Council Meeting - March 2026");
  });
});
