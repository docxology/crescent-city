#!/usr/bin/env bun
/**
 * News monitoring automation for Crescent City.
 * Fetches RSS feeds from Times-Standard, Lost Coast Outpost, and Humboldt Times.
 * Uses proper XML parsing for reliability.
 * Last run: 2026-03-13T20:58:55.916Z
 */
import { createLogger } from './logger.js';
import { computeSha256, htmlToText } from './utils.js';
import { DOMParser } from '@xmldom/xmldom';

const logger = createLogger('news_monitor');

// RSS feed URLs for local news sources
const NEWS_FEEDS = {
  'Times-Standard': 'https://www.times-standard.com/feed/',
  'North Coast Journal': 'https://www.northcoastjournal.com/feed/',
  'Lost Coast Outpost': 'https://lostcoastoutpost.com/feed',
  'Humboldt Times': 'https://www.humboldtnews.com/rss.xml',
  'KMUD Radio': 'https://kmud.org/feed/',
  'Lost Coast Journal': 'https://www.lostcoastjournal.com/feed/',
  'Eureka Times-Standard': 'https://www.times-standard.com/feed/',
  'Mad River Union': 'https://www.madriverunion.com/feed/'
};

// Keywords for filtering relevant Crescent City news
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
  'USGS'
];

/**
 * Fetch and parse an RSS feed using proper XML parsing
 */
export async function fetchRSSFeed(url: string, sourceName: string): Promise<Array<{title: string, link: string, pubDate: string, content: string}>> {
  try {
    logger.info(`Fetching RSS feed from ${sourceName}`, { url });
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CrescentCityIntelligenceBot/1.0 (+https://github.com/docxology/crescent-city)'
      }
    });
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
      
      if (titleElement && linkElement) {
        const title = titleElement.textContent?.replace(/<[^>]*>/g, '').trim() || '';
        const link = linkElement.textContent?.trim() || '';
        
        // Skip if we've already seen this link in this feed
        if (linksInFeed.has(link)) {
          continue;
        }
        linksInFeed.add(link);
        
        const pubDate = pubDateElement ? pubDateElement.textContent?.trim() || '' : '';
        const description = descriptionElement ? 
          htmlToText(descriptionElement.textContent || '').substring(0, 500) : '';
        
        // Check if article is relevant to Crescent City
        const isRelevant = CRESCENT_CITY_KEYWORDS.some(keyword => 
          title.toLowerCase().includes(keyword.toLowerCase()) || 
          description.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (isRelevant) {
          items.push({
            title,
            link,
            pubDate,
            content: description
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
 * Save news items to a JSON file for historical tracking
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
  
  const data = {
    fetchedAt: new Date().toISOString(),
    totalItems: items.length,
    items: items
  };
  
  await fs.writeFile(filename, JSON.stringify(data, null, 2));
  logger.info(`Saved news items to ${filename}`);
}

/**
 * Main news monitoring function with concurrent feed fetching
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
          // Skip if we've already seen this link from any source
          if (seenLinks.has(item.link)) {
            return;
          }
          seenLinks.add(item.link);
          
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