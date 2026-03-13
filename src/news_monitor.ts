#!/usr/bin/env bun
/**
 * News monitoring automation for Crescent City.
 * Fetches RSS feeds from Times-Standard and Lost Coast Outpost.
 * Last run: 2026-03-13T12:46:32.077Z
 */
import { createLogger } from './logger.js';
import { computeSha256, htmlToText } from './utils.js';

const logger = createLogger('news_monitor');

// RSS feed URLs for local news sources
const NEWS_FEEDS = {
  'Times-Standard': 'https://www.times-standard.com/news/rss.xml',
  'Lost Coast Outpost': 'https://lostcoastoutpost.com/feed'
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
 * Fetch and parse an RSS feed
 */
async function fetchRSSFeed(url: string, sourceName: string): Promise<Array<{title: string, link: string, pubDate: string, content: string}>> {
  try {
    logger.info(`Fetching RSS feed from ${sourceName}`, { url });
    
    // Note: In a real implementation, we'd use an XML parser or fetch and parse
    // For now, we'll simulate by fetching and extracting basic info
    // Since we don't have an XML parser readily available, we'll use a simplified approach
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const xmlText = await response.text();
    
    // Simple regex-based extraction for demo purposes
    // In production, use a proper XML parser like @xmldom/xmldom
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    
    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemContent = match[1];
      
      const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);
      const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const descriptionMatch = itemContent.match(/<description>([\s\S]*?)<\/description>/);
      
      if (titleMatch && linkMatch) {
        const title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
        const link = linkMatch[1].trim();
        const pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';
        const description = descriptionMatch ? htmlToText(descriptionMatch[1]).substring(0, 500) : '';
        
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
async function saveNewsItems(items: Array<{title: string, link: string, pubDate: string, content: string, source: string, fetchedAt: string}>): Promise<void> {
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
 * Main news monitoring function
 */
async function monitorNews(): Promise<void> {
  logger.info('=== Starting Crescent City News Monitoring ===');
  
  const allItems: Array<{title: string, link: string, pubDate: string, content: string, source: string, fetchedAt: string}> = [];
  
  // Fetch from each news source
  for (const [sourceName, url] of Object.entries(NEWS_FEEDS)) {
    try {
      const items = await fetchRSSFeed(url, sourceName);
      for (const item of items) {
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