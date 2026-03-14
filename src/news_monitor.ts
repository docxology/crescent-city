#!/usr/bin/env bun
/**
 * News monitoring automation for Crescent City.
 * Fetches RSS feeds from multiple local news sources with enhanced deduplication.
 * Uses proper XML parsing for reliability.
 * Last run: 2026-03-13T23:39:41.000Z
 */
import { createLogger } from './logger.js';
import { computeSha256, htmlToText } from './utils.js';
import { DOMParser } from '@xmldom/xmldom';

const logger = createLogger('news_monitor');

// Enhanced RSS feed URLs for local news sources with additional feeds
const NEWS_FEEDS = {
  'Times-Standard': 'https://www.times-standard.com/feed/',
  'North Coast Journal': 'https://www.northcoastjournal.com/feed/',
  'Lost Coast Outpost': 'https://lostcoastoutpost.com/feed',
  'Humboldt Times': 'https://www.humboldtcountynews.com/feed/',
  'KMUD Radio': 'https://kmud.org/feed/',
  'Del Norte Triplicate': 'https://www.delnortetriplicate.com/feed/',
  'KCET Local News': 'https://www.kcet.org/rss/local-news.xml',
};

// Enhanced keywords for filtering relevant Crescent City news
const CRESCENT_CITY_KEYWORDS = [
  'Crescent City',
  'Del Norte',
  'tsunami',
  'harbor',
  'fishing',
  'crabbing',
  'Pelican Bay',
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
  'NOAA',
  'USGS',
  'coastal',
  'evacuation route',
  'high tide',
  'flood',
  'wind',
  'red flag',
  'marine',
  'boat',
  'coast guard',
];

// Cache for deduplication across runs (in memory for this session)
const PROCESSED_ARTICLE_CACHE = new Set<string>();

/**
 * Generate a unique hash for an article based on title and link
 */
function generateArticleHash(title: string, link: string): string {
  const combined = `${title.trim().toLowerCase()}|${link.trim()}`;
  return computeSha256(combined);
}

/**
 * Fetch and parse an RSS feed using proper XML parsing with enhanced error handling
 */
export async function fetchRSSFeed(url: string, sourceName: string): Promise<Array<{title: string, link: string, pubDate: string, content: string}>> {
  try {
    logger.info(`Fetching RSS feed from ${sourceName}`, { url });
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const xmlText = await response.text();
    
    // Parse XML with DOMParser
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    // Check for parsing errors
    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
      throw new Error('Failed to parse XML');
    }
    
    const items: Array<{title: string, link: string, pubDate: string, content: string}> = [];
    const itemNodes = xmlDoc.getElementsByTagName("item");
    
    // Use a set to deduplicate by link within this feed
    const linksInFeed = new Set<string>();
    
    for (let i = 0; i < itemNodes.length; i++) {
      const item = itemNodes[i];
      
      const titleElement = item.getElementsByTagName("title")[0];
      const linkElement = item.getElementsByTagName("link")[0];
      const pubDateElement = item.getElementsByTagName("pubDate")[0];
      const descriptionElement = item.getElementsByTagName("description")[0];
      const contentElement = item.getElementsByTagName("content:encoded")[0]; // For some feeds
      
      if (titleElement && linkElement) {
        const title = titleElement.textContent?.replace(/<[^>]*>/g, '').trim() || '';
        const link = linkElement.textContent?.trim() || '';
        
        // Skip if we've already seen this link in this feed
        if (linksInFeed.has(link)) {
          continue;
        }
        linksInFeed.add(link);
        
        const pubDate = pubDateElement ? pubDateElement.textContent?.trim() || '' : '';
        // Use content:encoded if available, otherwise fall back to description
        let content = '';
        if (contentElement && contentElement.textContent) {
          content = htmlToText(contentElement.textContent).substring(0, 800);
        } else if (descriptionElement && descriptionElement.textContent) {
          content = htmlToText(descriptionElement.textContent).substring(0, 800);
        }
        
        // Check if article is relevant to Crescent City
        const isRelevant = CRESCENT_CITY_KEYWORDS.some(keyword => 
          title.toLowerCase().includes(keyword.toLowerCase()) || 
          content.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (isRelevant) {
          items.push({
            title,
            link,
            pubDate,
            content
          });
        }
      }
    }
    
    logger.info(`Fetched ${items.length} relevant items from ${sourceName}`, { count: items.length });
    return items;
    
  } catch (error) {
    logger.error(`Failed to fetch RSS feed from ${sourceName}`, { error: error.message, url });
    return [];
  }
}

/**
 * Save news items to a JSON file for historical tracking with enhanced metadata
 */
export async function saveNewsItems(items: Array<{title: string, link: string, pubDate: string, content: string, source: string, fetchedAt: string}>): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const dataDir = path.join(process.cwd(), 'output', 'news');
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (e) {
    // Directory might already exist
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(dataDir, `news-${timestamp}.json`);
  
  // Group items by source for better analytics
  const itemsBySource: Record<string, number> = {};
  items.forEach(item => {
    itemsBySource[item.source] = (itemsBySource[item.source] || 0) + 1;
  });
  
  const data = {
    fetchedAt: new Date().toISOString(),
    totalItems: items.length,
    itemsBySource,
    items: items
  };
  
  await fs.writeFile(filename, JSON.stringify(data, null, 2));
  logger.info(`Saved news items to ${filename}`);
}

/**
 * Main news monitoring function with concurrent feed fetching and enhanced deduplication
 */
export async function monitorNews(): Promise<void> {
  logger.info('=== Starting Crescent City News Monitoring ===');
  
  const allItems: Array<{title: string, link: string, pubDate: string, content: string, source: string, fetchedAt: string}> = [];
  const seenLinks = new Set<string>();
  
  // Fetch from each news source concurrently
  const fetchPromises = Object.entries(NEWS_FEEDS).map(
    async ([sourceName, url]) => {
      try {
        const items = await fetchRSSFeed(url, sourceName);
        for (const item of items) {
          // Generate hash for cross-run deduplication
          const articleHash = generateArticleHash(item.title, item.link);
          
          // Skip if we've already seen this article in this run
          if (seenLinks.has(item.link)) {
            return;
          }
          
          // Skip if we've processed this article in recent runs (cache deduplication)
          if (PROCESSED_ARTICLE_CACHE.has(articleHash)) {
            return;
          }
          
          seenLinks.add(item.link);
          PROCESSED_ARTICLE_CACHE.add(articleHash);
          
          allItems.push({
            ...item,
            source: sourceName,
            fetchedAt: new Date().toISOString()
          });
        }
      } catch (error) {
        logger.error(`Error processing ${sourceName}`, { error: error.message });
      }
    }
  );
  
  // Wait for all fetches to complete
  await Promise.all(fetchPromises);
  
  // Sort by publication date (newest first)
  allItems.sort((a, b) => {
    const dateA = new Date(a.pubDate).getTime();
    const dateB = new Date(b.pubDate).getTime();
    return dateB - dateA; // Descending
  });
  
  // Limit cache size to prevent memory growth (keep last 1000 articles)
  if (PROCESSED_ARTICLE_CACHE.size > 1000) {
    // Convert to array, keep last 500, recreate set
    const cacheArray = Array.from(PROCESSED_ARTICLE_CACHE);
    PROCESSED_ARTICLE_CACHE.clear();
    cacheArray.slice(-500).forEach(hash => PROCESSED_ARTICLE_CACHE.add(hash));
  }
  
  // Save the results
  if (allItems.length > 0) {
    await saveNewsItems(allItems);
    logger.info(`News monitoring complete: ${allItems.length} relevant items found`);
    
    // Log the top 3 items for immediate visibility
    for (let i = 0; i < Math.min(3, allItems.length); i++) {
      const item = allItems[i];
      logger.info(`Top news item ${i+1}:`, {
        title: item.title,
        source: item.source,
        pubDate: item.pubDate
      });
    }
  } else {
    logger.warn('No relevant news items found in this cycle');
  }
  
  logger.info('=== News Monitoring Complete ===');
}

// Run the monitoring if this script is executed directly
if (import.meta.main) {
  monitorNews().catch(error => {
    logger.error('News monitoring failed', { error: error.message });
    process.exit(1);
  });
}