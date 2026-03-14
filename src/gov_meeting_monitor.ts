#!/usr/bin/env bun
/**
 * Government meeting tracking automation for Crescent City.
 * Tracks agendas and minutes for city council, planning commission, and harbor commission.
 * Last run: 2026-03-13T13:29:50.793421
 */
import { createLogger } from './logger.js';
import { computeSha256, htmlToText } from './utils.js';

const logger = createLogger('gov_meeting_monitor');

// Government meeting sources
const GOV_SOURCES = {
  'City Council': 'https://crescentcity.org/government/city-council/agendas',
  'Planning Commission': 'https://crescentcity.org/government/planning-commission/agendas',
  'Harbor Commission': 'https://crescentcity.org/government/harbor-commission/agendas'
};

// Keywords for filtering relevant meeting items
const MEETING_KEYWORDS = [
  'agenda',
  'minutes',
  'meeting',
  'resolution',
  'ordinance',
  'budget',
  'tsunami',
  'harbor',
  'fishing',
  'emergency',
  'evacuation',
  'zoning',
  'permit',
  'development',
  'infrastructure',
  'safety'
];

/**
 * Fetch and parse a government meeting page using proper HTML parsing
 */
async function fetchGovMeetings(url: string, sourceName: string): Promise<Array<{title: string, link: string, date: string, content: string}>> {
  try {
    logger.info(`Fetching government meetings from ${sourceName}`, { url });
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const htmlText = await response.text();
    
    // Load HTML with cheerio for proper parsing
    const $ = load(htmlText);
    const items = [];
    const seenLinks = new Set<string>();
    
    // Look for common meeting-related elements
    $('a').each((index, element) => {
      const link = $(element).attr('href');
      const title = $(element).text().trim();
      
      if (!link || !title) {
        return;
      }
      
      // Skip if we've already seen this link
      if (seenLinks.has(link)) {
        return;
      }
      seenLinks.add(link);
      
      // Check if the title contains meeting keywords
      const isMeetingRelated = MEETING_KEYWORDS.some(keyword => 
        title.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (isMeetingRelated) {
        // Try to extract a date from nearby text or attributes
        let date = '';
        // Look for date in the element itself or nearby elements
        const dateText = $(element).text() + ' ' + $(element).parent().text() + ' ' + $(element).next().text();
        const dateMatch = dateText.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b\d{4}[\-\/]\d{1,2}[\-\/]\d{1,2}\b/);
        if (dateMatch) {
          date = dateMatch[0];
        }
        
        // Get some surrounding content for context
        const parentHtml = $(element).parent().html() ?? '';
        const contentStart = Math.max(0, parentHtml.indexOf(title) - 100);
        const contentEnd = Math.min(parentHtml.length, contentStart + 300);
        const content = htmlToText(parentHtml.substring(contentStart, contentEnd)).substring(0, 500);
        
        // Make link absolute if needed
        const absoluteLink = link.startsWith('http') ? link : new URL(link, url).toString();
        
        items.push({
          title,
          link: absoluteLink,
          date,
          content
        });
      }
    });
    
    logger.info(`Found ${items.length} meeting-related items from ${sourceName}`, { count: items.length });
    return items;
    
  } catch (error) {
    logger.error(`Failed to fetch government meetings from ${sourceName}`, { error: error.message, url });
    return [];
  }
}

/**
 * Save meeting items to a JSON file for historical tracking
 */
async function saveMeetingItems(items: Array<{title: string, link: string, date: string, content: string, source: string, fetchedAt: string}>): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const dataDir = path.join(process.cwd(), 'output', 'gov_meetings');
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (e) {
    // Directory might already exist
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(dataDir, `gov_meetings-${timestamp}.json`);
  
  const data = {
    fetchedAt: new Date().toISOString(),
    totalItems: items.length,
    items: items
  };
  
  await fs.writeFile(filename, JSON.stringify(data, null, 2));
  logger.info(`Saved meeting items to ${filename}`);
}

/**
 * Main government meeting monitoring function
 */
async function monitorGovMeetings(): Promise<void> {
  logger.info('=== Starting Crescent City Government Meeting Monitoring ===');
  
  const allItems: Array<{title: string, link: string, date: string, content: string, source: string, fetchedAt: string}> = [];
  const seenLinks = new Set<string>();
  
  // Fetch from each government source
  for (const [sourceName, url] of Object.entries(GOV_SOURCES)) {
    try {
      const items = await fetchGovMeetings(url, sourceName);
      for (const item of items) {
        // Skip if we've already seen this link from any source
        if (seenLinks.has(item.link)) {
          continue;
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
  
  // Sort by date (newest first), then by source
  allItems.sort((a, b) => {
    // Try to parse dates for sorting
    const dateA = a.date ? new Date(a.date.replace(/[\/\-]/g, '/')).getTime() : 0;
    const dateB = b.date ? new Date(b.date.replace(/[\/\-]/g, '/')).getTime() : 0;
    
    if (dateA !== dateB) {
      return dateB - dateA; // Newest first
    }
    return a.source.localeCompare(b.source); // Then by source name
  });
  
  // Save the results
  if (allItems.length > 0) {
    await saveMeetingItems(allItems);
    logger.info(`Government meeting monitoring complete: ${allItems.length} items found`);
    
    // Log the top 3 items for immediate visibility
    for (let i = 0; i < Math.min(3, allItems.length); i++) {
      const item = allItems[i];
      logger.info(`Top meeting item ${i+1}:`, {
        title: item.title,
        source: item.source,
        date: item.date || 'No date'
      });
    }
  } else {
    logger.warn('No government meeting items found in this cycle');
  }
  
  logger.info('=== Government Meeting Monitoring Complete ===');
}

// Run the monitoring if this script is executed directly
if (import.meta.main) {
  monitorGovMeetings().catch(error => {
    logger.error('Government meeting monitoring failed', { error: error.message });
    process.exit(1);
  });
}