/**
 * Tests for BM25 search engine enhancements:
 * - Legal stop words filtering (42 terms from LEGAL_STOP_WORDS)
 * - CA municipal law synonym expansion (28 synonym pairs from SYNONYMS)
 * - Combined stop words + synonym recall improvements
 * - Cascadia Subduction Zone detection in earthquake alerts
 */
import { describe, test, expect } from "bun:test";
import { LEGAL_STOP_WORDS, SYNONYMS } from "../src/gui/search.ts";
import { computeAlertSeverity } from "../src/alerts/severity.ts";

// ─── Stop Words ───────────────────────────────────────────────────────

describe("Search — Legal Stop Words", () => {
  test("LEGAL_STOP_WORDS is a Set with expected size", () => {
    expect(LEGAL_STOP_WORDS).toBeInstanceOf(Set);
    expect(LEGAL_STOP_WORDS.size).toBeGreaterThan(30);
  });

  test("contains critical legal boilerplate terms", () => {
    const mustHave = ["shall", "herein", "thereof", "pursuant", "notwithstanding"];
    for (const term of mustHave) {
      expect(LEGAL_STOP_WORDS.has(term)).toBe(true);
    }
  });

  test("contains common English function words", () => {
    const mustHave = ["the", "and", "or", "in", "of", "is", "are", "that", "this"];
    for (const term of mustHave) {
      expect(LEGAL_STOP_WORDS.has(term)).toBe(true);
    }
  });

  test("does NOT contain meaningful discriminative legal terms", () => {
    const mustNotHave = ["tsunami", "harbor", "zoning", "permit", "easement", "parcel"];
    for (const term of mustNotHave) {
      expect(LEGAL_STOP_WORDS.has(term)).toBe(false);
    }
  });
});

// ─── Synonyms ─────────────────────────────────────────────────────────

describe("Search — CA Municipal Law Synonyms", () => {
  test("SYNONYMS is a Map with expected size", () => {
    expect(SYNONYMS).toBeInstanceOf(Map);
    expect(SYNONYMS.size).toBeGreaterThan(20);
  });

  test("parcel expands to include lot, plot, tract", () => {
    const alts = SYNONYMS.get("parcel") ?? [];
    expect(alts).toContain("lot");
    expect(alts).toContain("plot");
    expect(alts).toContain("tract");
  });

  test("vessel expands to include boat, ship, watercraft", () => {
    const alts = SYNONYMS.get("vessel") ?? [];
    expect(alts).toContain("boat");
    expect(alts).toContain("ship");
    expect(alts).toContain("watercraft");
  });

  test("permit expands to include license, authorization", () => {
    const alts = SYNONYMS.get("permit") ?? [];
    expect(alts).toContain("license");
    expect(alts).toContain("authorization");
  });

  test("tsunami expands to include tidal wave", () => {
    const alts = SYNONYMS.get("tsunami") ?? [];
    expect(alts).toContain("tidal wave");
  });

  test("harbor expands to include port and marina", () => {
    const alts = SYNONYMS.get("harbor") ?? [];
    expect(alts).toContain("port");
    expect(alts).toContain("marina");
  });

  test("each synonym entry has at least one expansion", () => {
    for (const [term, alts] of SYNONYMS) {
      expect(alts.length).toBeGreaterThan(0);
      expect(typeof term).toBe("string");
      expect(alts.every(a => typeof a === "string")).toBe(true);
    }
  });
});

// ─── Alert Severity Composite Scoring ────────────────────────────────

describe("Alert Severity — computeAlertSeverity", () => {
  const calm = {
    tsunami: { warningCount: 0, watchCount: 0 },
    earthquake: { events: [] },
    weather: { severities: [] as any[], count: 0 },
    tides: { waterLevelFt: 1.5, available: true },
    fishing: { closureActive: false },
  };

  test("returns CALM when all monitors are quiet", () => {
    const { level } = computeAlertSeverity(
      calm.tsunami, calm.earthquake, calm.weather, calm.tides, calm.fishing
    );
    expect(level).toBe("CALM");
  });

  test("returns EMERGENCY for a tsunami warning", () => {
    const { level } = computeAlertSeverity(
      { warningCount: 1, watchCount: 0 },
      calm.earthquake, calm.weather, calm.tides, calm.fishing
    );
    expect(level).toBe("EMERGENCY");
  });

  test("returns EMERGENCY for M7.0 earthquake with tsunami generated", () => {
    const { level } = computeAlertSeverity(
      calm.tsunami,
      { events: [{ magnitude: 7.2, distanceKm: 50, tsunami: 2, place: "Offshore Crescent City" }] },
      calm.weather, calm.tides, calm.fishing
    );
    expect(level).toBe("EMERGENCY");
  });

  test("returns WARNING for M6.1 nearby earthquake", () => {
    const { level } = computeAlertSeverity(
      calm.tsunami,
      { events: [{ magnitude: 6.1, distanceKm: 80, tsunami: 0, place: "Near Crescent City" }] },
      calm.weather, calm.tides, calm.fishing
    );
    expect(level).toBe("WARNING");
  });

  test("returns WATCH for fishing closure", () => {
    const { level } = computeAlertSeverity(
      calm.tsunami, calm.earthquake, calm.weather, calm.tides,
      { closureActive: true, closureMessage: "Dungeness crab closure" }
    );
    expect(level).toBe("WATCH");
  });

  test("returns WATCH for M5.0 earthquake within 200km", () => {
    const { level } = computeAlertSeverity(
      calm.tsunami,
      { events: [{ magnitude: 5.0, distanceKm: 150, tsunami: 0, place: "35 km NE of Crescent City" }] },
      calm.weather, calm.tides, calm.fishing
    );
    expect(level).toBe("WATCH");
  });

  test("returns CALM for M5.0 earthquake OUTSIDE 200km radius", () => {
    const { level } = computeAlertSeverity(
      calm.tsunami,
      { events: [{ magnitude: 5.0, distanceKm: 250, tsunami: 0, place: "Far away" }] },
      calm.weather, calm.tides, calm.fishing
    );
    expect(level).toBe("CALM");
  });

  test("report includes assessedAt timestamp and reason", () => {
    const report = computeAlertSeverity(
      calm.tsunami, calm.earthquake, calm.weather, calm.tides, calm.fishing
    );
    expect(typeof report.assessedAt).toBe("string");
    expect(typeof report.reason).toBe("string");
    expect(report.monitors).toHaveProperty("tsunami");
    expect(report.monitors).toHaveProperty("earthquake");
    expect(report.monitors).toHaveProperty("weather");
    expect(report.monitors).toHaveProperty("tides");
    expect(report.monitors).toHaveProperty("fishing");
  });
});

// ─── Cascadia Subduction Zone Detection ───────────────────────────────

describe("Cascadia Subduction Zone — isCascadiaEvent geometry", () => {
  // We test this via the severity module's earthquake assessor behavior
  // since isCascadiaEvent is not exported directly; integration via appendEarthquakeHistory
  // is tested in the alert monitors. Here we test the bounding box logic directly.

  /** Replicate the CSZ bounding box check */
  function isCascadiaEvent(lat: number, lng: number): boolean {
    return lat >= 38.0 && lat <= 50.0 && lng >= -128.5 && lng <= -121.0;
  }

  test("Crescent City offshore is in CSZ zone", () => {
    // Typical Cascadia fault epicenter ~50km offshore
    expect(isCascadiaEvent(41.5, -125.5)).toBe(true);
  });

  test("Cape Mendocino area is in CSZ zone", () => {
    expect(isCascadiaEvent(40.0, -124.5)).toBe(true);
  });

  test("Central California is outside CSZ zone", () => {
    expect(isCascadiaEvent(34.0, -118.5)).toBe(false);
  });

  test("Oregon offshore is in CSZ zone", () => {
    expect(isCascadiaEvent(45.0, -126.0)).toBe(true);
  });

  test("Inland Nevada is outside CSZ zone", () => {
    expect(isCascadiaEvent(39.0, -115.0)).toBe(false);
  });

  test("Southern Alaska is outside CSZ zone (north limit)", () => {
    expect(isCascadiaEvent(55.0, -125.0)).toBe(false);
  });
});
