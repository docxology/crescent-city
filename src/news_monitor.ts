#!/usr/bin/env bun
/**
 * News monitoring automation for Crescent City.
 *
 * Fetches RSS feeds from Times-Standard, Lost Coast Outpost, and Humboldt Times.
 * Uses proper XML parsing via @xmldom/xmldom for reliability.
 * Deduplicates across sources and filters for Crescent City–relevant content.
 *
 * Usage:
 *   bun run src/news_monitor.ts
 *   bun run news
 *
 * Output: JSON files written to output/news/
 */
import { createLogger } from './logger.js';
import { htmlToText } from './utils.js';
import { DOMParser } from '@xmldom/xmldom';
import { mkdir, writeFile, readFile, appendFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const logger = createLogger('news_monitor');

/** RSS feed URLs for local news sources covering the NorCal coast */
const NEWS_FEEDS: Record<string, string> = {
  'Times-Standard': 'https://www.times-standard.com/news/rss.xml',
  'Lost Coast Outpost': 'https://lostcoastoutpost.com/feed',
  'Humboldt Times': 'https://www.humboldtcountynews.com/feed',
  'KIEM-TV NBC Eureka': 'https://www.kiemtv.com/feed/',
};

const NEWS_OUTPUT_DIR = join(process.cwd(), 'output', 'news');
/** Persistent deduplication index — survives restarts */
const SEEN_IDS_PATH = join(NEWS_OUTPUT_DIR, 'seen-ids.json');

/** Normalize a URL to a stable dedup key (strip tracking params, trailing slash) */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Remove common tracking parameters
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref'].forEach(p => u.searchParams.delete(p));
    return u.origin + u.pathname.replace(/\/$/, '');
  } catch {
    return url.trim();
  }
}

/** Load persisted seen-ids set from disk. Returns empty set if file not found. */
export async function loadSeenIds(): Promise<Set<string>> {
  if (!existsSync(SEEN_IDS_PATH)) return new Set();
  try {
    const raw = await readFile(SEEN_IDS_PATH, 'utf-8');
    const arr: string[] = JSON.parse(raw);
    return new Set(arr);
  } catch {
    return new Set();
  }
}

/** Persist seen-ids set to disk (capped at 10,000 most recent entries). */
export async function saveSeenIds(seen: Set<string>): Promise<void> {
  await mkdir(NEWS_OUTPUT_DIR, { recursive: true });
  // Cap to avoid unbounded growth — keep most recent
  const arr = [...seen].slice(-10_000);
  await writeFile(SEEN_IDS_PATH, JSON.stringify(arr, null, 2));
}

/** Keywords triggering inclusion — case-insensitive substring match */
const CRESCENT_CITY_KEYWORDS = [
  'crescent city',
  'del norte',
  'tsunami',
  'harbor',
  'fishing',
  'crabbing',
  'pelican bay',
  'emergency',
  'evacuation',
  'weather',
  'storm',
  'earthquake',
  'fire',
  'police',
  'city council',
  'planning commission',
  'harbor commission',
  'noaa',
  'usgs',
];

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  source: string;
  fetchedAt: string;
}

/**
 * Fetch and parse a single RSS feed, returning only Crescent City–relevant items.
 * Returns an empty array on any network or parse error (graceful degradation).
 */
export async function fetchRSSFeed(
  url: string,
  sourceName: string
): Promise<Array<Omit<NewsItem, 'source' | 'fetchedAt'>>> {
  try {
    logger.info(`Fetching RSS feed from ${sourceName}`, { url });

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CrescentCityIntelligenceSystem/1.0 (github.com/docxology/crescent-city)',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xmlText = await response.text();

    // Parse with DOMParser — more robust than regex for real-world RSS
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
      throw new Error('Failed to parse XML');
    }

    const items: Array<Omit<NewsItem, 'source' | 'fetchedAt'>> = [];
    const seenLinks = new Set<string>();
    const itemNodes = xmlDoc.getElementsByTagName('item');

    for (let i = 0; i < itemNodes.length; i++) {
      const item = itemNodes[i];

      const titleEl = item.getElementsByTagName('title')[0];
      const linkEl = item.getElementsByTagName('link')[0];
      const pubDateEl = item.getElementsByTagName('pubDate')[0];
      const descEl = item.getElementsByTagName('description')[0];

      if (!titleEl || !linkEl) continue;

      const title = titleEl.textContent?.replace(/<[^>]*>/g, '').trim() ?? '';
      const link = linkEl.textContent?.trim() ?? '';

      if (!link || seenLinks.has(link)) continue;
      seenLinks.add(link);

      const pubDate = pubDateEl?.textContent?.trim() ?? '';
      const content = descEl
        ? htmlToText(descEl.textContent ?? '').substring(0, 500)
        : '';

      // Filter for Crescent City relevance
      const haystack = `${title} ${content}`.toLowerCase();
      const isRelevant = CRESCENT_CITY_KEYWORDS.some((kw) => haystack.includes(kw));

      if (isRelevant) {
        items.push({ title, link, pubDate, content });
      }
    }

    logger.info(`Fetched ${items.length} relevant items from ${sourceName}`, {
      count: items.length,
    });
    return items;
  } catch (error: any) {
    logger.error(`Failed to fetch RSS feed from ${sourceName}`, {
      error: error.message,
      url,
    });
    return [];
  }
}

/**
 * Persist a batch of news items to output/news/ as a timestamped JSON file.
 */
export async function saveNewsItems(items: NewsItem[]): Promise<string> {
  await mkdir(NEWS_OUTPUT_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = join(NEWS_OUTPUT_DIR, `news-${timestamp}.json`);

  const payload = {
    fetchedAt: new Date().toISOString(),
    totalItems: items.length,
    items,
  };

  await writeFile(filename, JSON.stringify(payload, null, 2));
  logger.info(`Saved ${items.length} news items to ${filename}`);
  return filename;
}

/**
 * Main news monitoring function.
 *
 * Fetches all configured feeds concurrently, deduplicates across sources
 * AND against the persistent seen-ids index (survives restarts),
 * sorts by publication date (newest first), and persists to disk.
 *
 * @param filterKeywords - Optional additional keywords to filter by (combined with defaults via OR)
 */
export async function monitorNews(filterKeywords?: string[]): Promise<NewsItem[]> {
  logger.info('=== Starting Crescent City News Monitoring ===');

  const effectiveKeywords = filterKeywords
    ? [...CRESCENT_CITY_KEYWORDS, ...filterKeywords.map(k => k.toLowerCase())]
    : CRESCENT_CITY_KEYWORDS;

  // Load persistent dedup index
  const persistedSeen = await loadSeenIds();
  const sessionSeen = new Set<string>(persistedSeen);
  const allItems: NewsItem[] = [];
  const newIds: string[] = [];

  // Fetch all feeds concurrently
  const fetchResults = await Promise.all(
    Object.entries(NEWS_FEEDS).map(async ([sourceName, url]) => {
      try {
        return { sourceName, items: await fetchRSSFeed(url, sourceName) };
      } catch (error: any) {
        logger.error(`Error processing ${sourceName}`, { error: error.message });
        return { sourceName, items: [] };
      }
    })
  );

  const fetchedAt = new Date().toISOString();
  for (const { sourceName, items } of fetchResults) {
    for (const item of items) {
      // Apply keyword filter if custom keywords provided
      if (filterKeywords) {
        const haystack = `${item.title} ${item.content}`.toLowerCase();
        if (!effectiveKeywords.some(kw => haystack.includes(kw))) continue;
      }

      const key = normalizeUrl(item.link);
      if (sessionSeen.has(key)) continue; // cross-source + cross-run dedup
      sessionSeen.add(key);
      newIds.push(key);
      allItems.push({ ...item, source: sourceName, fetchedAt });
    }
  }

  // Sort newest first
  allItems.sort((a, b) => {
    const ta = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const tb = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return tb - ta;
  });

  // Persist updated seen-ids
  if (newIds.length > 0) {
    await saveSeenIds(sessionSeen);
    logger.info(`Added ${newIds.length} new URL(s) to dedup index (total: ${sessionSeen.size})`);
  }

  if (allItems.length > 0) {
    await saveNewsItems(allItems);
    logger.info(`News monitoring complete: ${allItems.length} new relevant items found`);
    for (let i = 0; i < Math.min(3, allItems.length); i++) {
      const { title, source, pubDate } = allItems[i];
      logger.info(`  #${i + 1}: [${source}] ${title}`, { pubDate });
    }
  } else {
    logger.info('No new relevant items found (all already seen or no matches)');
  }

  logger.info('=== News Monitoring Complete ===');
  return allItems;
}

// CLI entry point
if (import.meta.main) {
  monitorNews().catch((error: any) => {
    logger.error('News monitoring failed', { error: error.message });
    process.exit(1);
  });
}