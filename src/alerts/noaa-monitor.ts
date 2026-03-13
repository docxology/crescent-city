#!/usr/bin/env bun
/**
 * NOAA tsunami warning monitoring for Crescent City.
 * Subscribes to NOAA CAP alerts and processes tsunami warnings.
 */
import { createLogger } from '../logger.js';
import { computeSha256 } from '../utils.js';
import { DOMParser } from '@xmldom/xmldom';

const logger = createLogger('noaa_monitor');

// NOAA CAP alert feed for California (includes tsunami warnings)
const NOAA_CAP_FEED = 'https://alerts.weather.gov/cap/wwaatmget.php?x=CA123';

// Cache for processed alert IDs to avoid duplicates
const processedAlerts = new Set<string>();

/**
 * Fetch and parse NOAA CAP alerts
 */
export async function fetchNoaaAlerts(): Promise<Array<{
  id: string;
  title: string;
  severity: string;
  certainty: string;
  urgency: string;
  event: string;
  areaDesc: string;
  effective: string;
  expires: string;
  description: string;
  instruction: string;
  polygon: string | null;
}>> {
  try {
    logger.info('Fetching NOAA CAP alerts', { url: NOAA_CAP_FEED });
    
    const response = await fetch(NOAA_CAP_FEED);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const xmlText = await response.text();
    
    // Parse XML with DOMParser
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    // Check for parsing errors
    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
      throw new Error('Failed to parse NOAA CAP XML');
    }
    
    const alerts: Array<{
      id: string;
      title: string;
      severity: string;
      certainty: string;
      urgency: string;
      event: string;
      areaDesc: string;
      effective: string;
      expires: string;
      description: string;
      instruction: string;
      polygon: string | null;
    }> = [];
    
    // Get all alert entries
    const entries = xmlDoc.getElementsByTagName("entry");
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      
      // Extract basic alert info
      const idElement = entry.getElementsByTagName("id")[0];
      const titleElement = entry.getElementsByTagName("title")[0];
      const updatedElement = entry.getElementsByTagName("updated")[0];
      
      if (!idElement || !titleElement) {
        continue;
      }
      
      const alertId = idElement.textContent?.trim() || '';
      const title = titleElement.textContent?.trim() || '';
      
      // Skip if we've already processed this alert
      if (processedAlerts.has(alertId)) {
        continue;
      }
      
      // Get the CAP alert content (usually in the first <content> tag)
      const contentElement = entry.getElementsByTagName("content")[0];
      if (!contentElement) {
        continue;
      }
      
      // The CAP alert is usually in a <alert> namespace within the content
      let alertElement = contentElement.getElementsByTagNameNS("urn:oasis:names:tc:emergency:cap:1.2", "alert")[0];
      if (!alertElement) {
        // Fallback: try without namespace
        const alertElements = contentElement.getElementsByTagName("alert");
        if (alertElements.length > 0) {
          alertElement = alertElements[0];
        }
      }
      
      if (!alertElement) {
        continue;
      }
      
      // Extract CAP fields
      const getElementText = (tagName: string, namespaceURI?: string): string => {
        let element;
        if (namespaceURI) {
          element = alertElement.getElementsByTagNameNS(namespaceURI, tagName)[0];
        } else {
          element = alertElement.getElementsByTagName(tagName)[0];
        }
        return element ? element.textContent?.trim() || '' : '';
      };
      
      const identifier = getElementText('identifier', 'urn:oasis:names:tc:emergency:cap:1.2');
      // Use identifier as fallback ID if needed
      const finalId = alertId || identifier;
      
      const event = getElementText('event', 'urn:oasis:names:tc:emergency:cap:1.2');
      const effective = getElementText('effective', 'urn:oasis:names:tc:emergency:cap:1.2');
      const expires = getElementText('expires', 'urn:oasis:names:tc:emergency:cap:1.2');
      const sender = getElementText('sender', 'urn:oasis:names:tc:emergency:cap:1.2');
      const status = getElementText('status', 'urn:oasis:names:tc:emergency:cap:1.2');
      const msgType = getElementText('msgType', 'urn:oasis:names:tc:emergency:cap:1.2');
      const severity = getElementText('severity', 'urn:oasis:names:tc:emergency:cap:1.2');
      const certainty = getElementText('certainty', 'urn:oasis:names:tc:emergency:cap:1.2');
      const urgency = getElementText('urgency', 'urn:oasis:names:tc:emergency:cap:1.2');
      const areaDesc = getElementText('areaDesc', 'urn:oasis:names:tc:emergency:cap:1.2');
      const description = getElementText('description', 'urn:oasis:names:tc:emergency:cap:1.2');
      const instruction = getElementText('instruction', 'urn:oasis:names:tc:emergency:cap:1.2');
      
      // Extract polygon if available
      let polygon = null;
      const polygonElement = alertElement.getElementsByTagNameNS("urn:oasis:names:tc:emergency:cap:1.2", "polygon")[0];
      if (polygonElement) {
        polygon = polygonElement.textContent?.trim() || null;
      }
      
      // Only process actual alerts (not cancellations or tests)
      if (msgType !== 'Alert' || status !== 'Actual') {
        continue;
      }
      
      // Check if this is a tsunami-related event
      const isTsunamiRelated = event.toLowerCase().includes('tsunami') || 
                              title.toLowerCase().includes('tsunami') ||
                              description.toLowerCase().includes('tsunami');
      
      // For now, we'll process all alerts but log tsunami-specific ones
      if (isTsunamiRelated) {
        logger.info('Tsunami alert detected', {
          id: finalId,
          event,
          severity,
          certainty,
          urgency,
          areaDesc: areaDesc.substring(0, 100) + (areaDesc.length > 100 ? '...' : '')
        });
      }
      
      alerts.push({
        id: finalId,
        title,
        severity,
        certainty,
        urgency,
        event,
        areaDesc,
        effective,
        expires,
        description,
        instruction,
        polygon
      });
      
      // Mark as processed
      processedAlerts.add(finalId);
    }
    
    logger.info(`Fetched ${alerts.length} new NOAA alerts`);
    return alerts;
    
  } catch (error) {
    logger.error('Failed to fetch NOAA CAP alerts', { error: error.message });
    return [];
  }
}

/**
 * Save NOAA alerts to JSON file for historical tracking
 */
export async function saveNoaaAlerts(alerts: Array<{
  id: string;
  title: string;
  severity: string;
  certainty: string;
  urgency: string;
  event: string;
  areaDesc: string;
  effective: string;
  expires: string;
  description: string;
  instruction: string;
  polygon: string | null;
  fetchedAt: string;
}>): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const dataDir = path.join(process.cwd(), 'output', 'alerts', 'tsunami');
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (e) {
    // Directory might already exist
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(dataDir, `noaa-alerts-${timestamp}.json`);
  
  const data = {
    fetchedAt: new Date().toISOString(),
    totalAlerts: alerts.length,
    alerts: alerts
  };
  
  await fs.writeFile(filename, JSON.stringify(data, null, 2));
  logger.info(`Saved NOAA alerts to ${filename}`);
}

/**
 * Main NOAA monitoring function
 */
export async function monitorNoaaAlerts(): Promise<void> {
  logger.info('=== Starting NOAA Tsunami Alert Monitoring ===');
  
  try {
    const alerts = await fetchNoaaAlerts();
    
    if (alerts.length > 0) {
      // Add fetched timestamp to each alert
      const alertsWithTimestamp = alerts.map(alert => ({
        ...alert,
        fetchedAt: new Date().toISOString()
      }));
      
      await saveNoaaAlerts(alertsWithTimestamp);
      
      logger.info(`NOAA monitoring complete: ${alerts.length} new alerts processed`);
      
      // Log tsunami-specific alerts
      const tsunamiAlerts = alerts.filter(alert => 
        alert.event.toLowerCase().includes('tsunami') || 
        alert.title.toLowerCase().includes('tsunami')
      );
      
      if (tsunamiAlerts.length > 0) {
        logger.warn(`Tsunami alerts detected: ${tsunamiAlerts.length}`, {
          alerts: tsunamiAlerts.map(a => ({
            id: a.id,
            event: a.event,
            severity: a.severity,
            certainty: a.certainty,
            urgency: a.urgency,
            area: a.areaDesc.substring(0, 50)
          }))
        });
      }
    } else {
      logger.info('NOAA monitoring complete: No new alerts');
    }
    
  } catch (error) {
    logger.error('NOAA monitoring failed', { error: error.message });
  }
  
  logger.info('=== NOAA Tsunami Alert Monitoring Complete ===');
}

// Run the monitoring if this script is executed directly
if (import.meta.main) {
  monitorNoaaAlerts().catch(error => {
    logger.error('NOAA monitoring failed', { error: error.message });
    process.exit(1);
  });
}