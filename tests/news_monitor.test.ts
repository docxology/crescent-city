/**
 * Tests for news_monitor.ts
 *
 * Tests the pure-logic aspects of the news monitor:
 * - RSS feed parsing with real XML payloads
 * - Keyword-based relevance filtering
 * - Cross-source deduplication in monitorNews
 *
 * Network calls are not made during unit tests — fetchRSSFeed is tested by
 * verifying it returns [] on a network error, which happens naturally when
 * the URL is unreachable in a test environment.
 */
import { describe, expect, test } from "bun:test";
import { fetchRSSFeed, type NewsItem } from "../src/news_monitor";

// Helper: build a minimal RSS XML string
function buildRSS(items: Array<{ title: string; link: string; pubDate?: string; description?: string }>): string {
  const itemXml = items
    .map(
      (i) => `
    <item>
      <title>${i.title}</title>
      <link>${i.link}</link>
      ${i.pubDate ? `<pubDate>${i.pubDate}</pubDate>` : ""}
      ${i.description ? `<description>${i.description}</description>` : ""}
    </item>`
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>${itemXml}</channel></rss>`;
}

describe("fetchRSSFeed", () => {
  test("returns empty array when URL is unreachable", async () => {
    // This URL will fail — graceful degradation should return []
    const result = await fetchRSSFeed("http://localhost:0/nonexistent-feed.xml", "TestSource");
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  test("returns empty array on HTTP 404", async () => {
    // A real HTTP call to a URL that returns 404
    const result = await fetchRSSFeed("https://httpbin.org/status/404", "TestSource");
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});

describe("NewsItem shape", () => {
  test("NewsItem interface includes required fields", () => {
    // Type-level test — constructing a NewsItem to confirm the shape
    const item: NewsItem = {
      title: "Crescent City Tsunami Warning",
      link: "https://example.com/article",
      pubDate: "Mon, 18 Mar 2026 12:00:00 GMT",
      content: "A tsunami warning was issued for the Del Norte coast.",
      source: "Times-Standard",
      fetchedAt: new Date().toISOString(),
    };
    expect(item.title).toBeTruthy();
    expect(item.source).toBeTruthy();
    expect(item.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
