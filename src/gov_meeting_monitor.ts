#!/usr/bin/env bun
/**
 * Government meeting tracking automation for Crescent City.
 * Tracks agendas and minutes for city council, planning commission, and harbor commission.
 * Last run: 2026-03-13T12:41:38.098171
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
 * Fetch and parse a government meeting page
 */
async function fetchGovMeetings(url: string, sourceName: string): Promise<Array<{title: string, link: string, date: string, content: string}>> {
  try {
    logger.info(`Fetching government meetings from ${sourceName}`, { url });
    
    // Note: In a real implementation, we'd use an HTML parser or fetch and parse
    // For now, we'll simulate by fetching and extracting basic info
    // Since we don't have an HTML parser readily available, we'll use a simplified approach
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Simple regex-based extraction for demo purposes
    // In production, use a proper HTML parser like @xmldom/xmldom
    const items = [];
    const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi;
    let match;
    
    while ((match = linkRegex.exec(html)) !== null) {
      const link = match[1];
      const title = match[2].replace(/<[^>]*>/g, '').trim();
      
      // Check if link is relevant to government meetings
      const isRelevant = MEETING_KEYWORDS.some(keyword => 
        title.toLowerCase().includes(keyword.toLowerCase()) ||
        link.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (isRelevant && link && title) {
        // Try to extract date from nearby text
        const dateMatch = html.substring(Math.max(0, match.index - 200), match.index + 200)
          .match(/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\w+ \d{1,2},? \d{4}/);
        const date = dateMatch ? dateMatch[0] : '';
        
        items.push({
          title,
          link: link.startsWith('http') ? link : `https://crescentcity.org${link}`,
          date,
          content: title // Simplified
        });
      }
    }
    
    logger.info(`Found ${items.length} government meeting items from ${sourceName}`, { count: items.length });
    return items;
    
  } catch (error) {
    logger.error(`Failed to fetch government meetings from ${sourceName}`, { error: error.message, url });
    return [];
  }
}

/**
 * Save government meeting items to a JSON file for historical tracking
 */
async function saveGovMeetingItems(items: Array<{title: string, link: string, date: string, content: string, source: string, fetchedAt: string}>): Promise<void> {
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
  logger.info(`Saved government meeting items to ${filename}`);
}

/**
 * Main government meeting monitoring function
 */
async function monitorGovMeetings(): Promise<void> {
  logger.info('=== Starting Crescent City Government Meeting Monitoring ===');
  
  const allItems: Array<{title: string, link: string, date: string, content: string, source: string, fetchedAt: string}> = [];
  
  // Fetch from each government source
  for (const [sourceName, url] of Object.entries(GOV_SOURCES)) {
    try {
      const items = await fetchGovMeetings(url, sourceName);
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
  
  // Sort by date (newest first)
  allItems.sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA; // Descending
  });
  
  // Save the results
  if (allItems.length > 0) {
    await saveGovMeetingItems(allItems);
    logger.info(`Government meeting monitoring complete: ${allItems.length} relevant items found`);
    
    // Log the top 3 items for immediate visibility
    for (let i = 0; i < Math.min(3, allItems.length); i++) {
      const item = allItems[i];
      logger.info(`Top gov meeting item ${i+1}:`, {
        title: item.title,
        source: item.source,
        date: item.date
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