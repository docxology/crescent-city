import { describe, expect, test } from "bun:test";
import {
  domains,
  getDomainById,
  getDomainSummaries,
  searchDomains,
} from "../src/domains";

describe("Intelligence Domains", () => {
  test("has exactly 9 domains", () => {
    expect(domains).toHaveLength(9);
  });

  test("each domain has required fields", () => {
    for (const domain of domains) {
      expect(domain.id).toBeTruthy();
      expect(domain.name).toBeTruthy();
      expect(domain.description).toBeTruthy();
      expect(domain.icon).toBeTruthy();
      expect(domain.updatedAt).toBeTruthy();
      expect(domain.topics.length).toBeGreaterThan(0);
    }
  });

  test("domain IDs are unique", () => {
    const ids = domains.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("each topic has tags and sources", () => {
    for (const domain of domains) {
      for (const topic of domain.topics) {
        expect(topic.name).toBeTruthy();
        expect(topic.description).toBeTruthy();
        expect(topic.tags.length).toBeGreaterThan(0);
        expect(topic.sources.length).toBeGreaterThan(0);
        for (const source of topic.sources) {
          expect(source.sectionNumber).toBeTruthy();
          expect(source.relevance).toBeTruthy();
        }
      }
    }
  });

  test("getDomainById returns correct domain", () => {
    const em = getDomainById("emergency-management");
    expect(em).toBeDefined();
    expect(em!.name).toBe("Emergency Management");
    expect(em!.icon).toBe("🌊");
  });

  test("getDomainById returns undefined for invalid ID", () => {
    expect(getDomainById("nonexistent")).toBeUndefined();
  });

  test("getDomainSummaries returns summaries without topics", () => {
    const summaries = getDomainSummaries();
    expect(summaries).toHaveLength(9);
    for (const s of summaries) {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.topicCount).toBeGreaterThan(0);
      // Should not include full topics array
      expect((s as any).topics).toBeUndefined();
    }
  });

  test("housing-homelessness domain exists and has housing topics", () => {
    const hh = getDomainById("housing-homelessness");
    expect(hh).toBeDefined();
    expect(hh!.icon).toBe("🏠");
    const tags = hh!.topics.flatMap(t => t.tags);
    expect(tags).toContain("affordable housing");
    expect(tags).toContain("homelessness");
  });

  test("searchDomains finds tsunami-related content", () => {
    const results = searchDomains("tsunami");
    expect(results.length).toBeGreaterThan(0);
    // Emergency management and event planning should match
    const ids = results.map(r => r.id);
    expect(ids).toContain("emergency-management");
  });

  test("searchDomains finds fishing-related content", () => {
    const results = searchDomains("fishing");
    expect(results.length).toBeGreaterThan(0);
    const ids = results.map(r => r.id);
    expect(ids).toContain("business-development");
  });

  test("searchDomains returns empty for unmatched query", () => {
    const results = searchDomains("xyznonexistent12345");
    expect(results).toHaveLength(0);
  });

  test("all domain IDs are lowercase kebab-case", () => {
    for (const domain of domains) {
      expect(domain.id).toMatch(/^[a-z][a-z0-9-]*[a-z0-9]$/);
    }
  });

  test("emergency-management has tsunami topic", () => {
    const em = getDomainById("emergency-management")!;
    const tsunamiTopic = em.topics.find(t => t.name.includes("Tsunami"));
    expect(tsunamiTopic).toBeDefined();
    expect(tsunamiTopic!.tags).toContain("tsunami");
  });

  test("business-development has fishing topic", () => {
    const bd = getDomainById("business-development")!;
    const fishingTopic = bd.topics.find(t => t.name.includes("Fishing"));
    expect(fishingTopic).toBeDefined();
    expect(fishingTopic!.tags).toContain("fishing");
  });

  test("public-safety has prison topic", () => {
    const ps = getDomainById("public-safety")!;
    const prisonTopic = ps.topics.find(t => t.name.includes("Prison"));
    expect(prisonTopic).toBeDefined();
    expect(prisonTopic!.tags).toContain("pelican bay");
  });
});
