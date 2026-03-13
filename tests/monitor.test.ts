import { describe, expect, test } from "bun:test";
import type { MonitorReport } from "../src/monitor";

describe("Monitor types and structure", () => {
  test("MonitorReport interface has correct shape", () => {
    // Verify the type by constructing a conforming object
    const report: MonitorReport = {
      timestamp: new Date().toISOString(),
      articlesChecked: 0,
      hashMismatches: [],
      missingSections: [],
      newSections: [],
      overallStatus: "clean",
      summary: "Test report",
    };
    expect(report.timestamp).toBeTruthy();
    expect(report.overallStatus).toBe("clean");
    expect(typeof report.articlesChecked).toBe("number");
    expect(Array.isArray(report.hashMismatches)).toBe(true);
    expect(Array.isArray(report.missingSections)).toBe(true);
    expect(Array.isArray(report.newSections)).toBe(true);
  });

  test("MonitorReport allows 'changed' status", () => {
    const report: MonitorReport = {
      timestamp: new Date().toISOString(),
      articlesChecked: 10,
      hashMismatches: ["guid1: hash mismatch"],
      missingSections: [],
      newSections: [],
      overallStatus: "changed",
      summary: "Found 1 mismatch",
    };
    expect(report.overallStatus).toBe("changed");
    expect(report.hashMismatches).toHaveLength(1);
  });

  test("MonitorReport allows 'error' status", () => {
    const report: MonitorReport = {
      timestamp: new Date().toISOString(),
      articlesChecked: 0,
      hashMismatches: [],
      missingSections: [],
      newSections: [],
      overallStatus: "error",
      summary: "No scraped data found",
    };
    expect(report.overallStatus).toBe("error");
  });
});
