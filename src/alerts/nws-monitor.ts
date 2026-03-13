#!/usr/bin/env bun
/**
 * NWS weather alert monitoring for Crescent City.
 * Monitors National Weather Service alerts for coastal flood, high wind, and storm warnings.
 */
import { createLogger } from '../logger.js';

const logger = createLogger('nws_monitor');

// NWS alert feed for California zone CAZ006 (Del Norte County Coast)
const NWS_ALERT_FEED = 'https://api.weather.gov/alerts/active?zone=CAZ006&status=actual&message_type=alert';

/**
 * Fetch and parse NWS weather alerts
 */
export async function fetchNwsAlerts(): Promise<{
  id: string;
  areaDesc: string;
  event: string;
  severity: string;
  certainty: string;
  urgency: string;
  effective: string;
  expires: string;
  sender: string;
  description: string;
  instruction: string;
  polygon: string | null;
  parameters: Record<string, any>;
}[]> {
  try {
    logger.info('Fetching NWS weather alerts', { url: NWS_ALERT_FEED });
    
    const response = await fetch(NWS_ALERT_FEED, {
      headers: {
        'User-Agent': 'CrescentCityIntelligenceSystem/1.0 (https://github.com/docxology/crescent-city)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.features || !Array.isArray(data.features)) {
      throw new Error('Invalid NWS alert data format');
    }
    
    const alerts: {
      id: string;
      areaDesc: string;
      event: string;
      severity: string;
      certainty: string;
      urgency: string;
      effective: string;
      expires: string;
      sender: string;
      description: string;
      instruction: string;
      polygon: string | null;
      parameters: Record<string, any>;
    }[] = [];
    
    for (const feature of data.features) {
      const props = feature.properties;
      const geometry = feature.geometry;
      
      if (!props) {
        continue;
      }
      
      // Extract polygon if available
      let polygon = null;
      if (geometry && geometry.coordinates) {
        // Convert GeoJSON polygon to string representation
        polygon = JSON.stringify(geometry.coordinates);
      }
      
      alerts.push({
        id: props.id,
        areaDesc: props.areaDesc ?? '',
        event: props.event ?? '',
        severity: props.severity ?? '',
        certainty: props.certainty ?? '',
        urgency: props.urgency ?? '',
        effective: props.effective ?? '',
        expires: props.expires ?? '',
        sender: props.sender ?? '',
        description: props.description ?? '',
        instruction: props.instruction ?? '',
        polygon,
        parameters: props.parameters ?? {}
      });
    }
    
    logger.info(`Fetched ${alerts.length} NWS weather alerts`);
    return alerts;
    
  } catch (error) {
    logger.error('Failed to fetch NWS weather alerts', { error: error.message });
    return [];
  }
}

/**
 * Save NWS alerts to JSON file for historical tracking
 */
export async function saveNwsAlerts(alerts: {
  id: string;
  areaDesc: string;
  event: string;
  severity: string;
  certainty: string;
  urgency: string;
  effective: string;
  expires: string;
  sender: string;
  description: string;
  instruction: string;
  polygon: string | null;
  parameters: Record<string, any>;
  fetchedAt: string;
}[]): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const dataDir = path.join(process.cwd(), 'output', 'alerts', 'weather');
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (e) {
    // Directory might already exist
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(dataDir, `nws-alerts-${timestamp}.json`);
  
  const data = {
    fetchedAt: new Date().toISOString(),
    totalAlerts: alerts.length,
    alerts: alerts
  };
  
  await fs.writeFile(filename, JSON.stringify(data, null, 2));
  logger.info(`Saved NWS alerts to ${filename}`);
}

/**
 * Main NWS monitoring function
 */
export async function monitorNwsAlerts(): Promise<void> {
  logger.info('=== Starting NWS Weather Alert Monitoring ===');
  
  try {
    const alerts = await fetchNwsAlerts();
    
    if (alerts.length > 0) {
      // Add fetched timestamp to each alert
      const alertsWithTimestamp = alerts.map(alert => ({
        ...alert,
        fetchedAt: new Date().toISOString()
      }));
      
      await saveNwsAlerts(alertsWithTimestamp);
      
      logger.info(`NWS monitoring complete: ${alerts.length} new alerts processed`);
      
      // Filter for relevant weather events (coastal flood, high wind, storm warnings)
      const relevantEvents = ['Coastal Flood', 'High Wind', 'Storm', 'Marine', 'Gale', 'Freeze', 'Hard Freeze', 'Blizzard', 'Winter Storm', 'Ice Storm', 'Lake Effect Snow'];
      
      const relevantAlerts = alerts.filter(alert => 
        relevantEvents.some(event => alert.event.includes(event))
      );
      
      if (relevantAlerts.length > 0) {
        logger.warn(`Relevant weather alerts detected: ${relevantAlerts.length}`, {
          alerts: relevantAlerts.map(a => ({
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
      logger.info('NWS monitoring complete: No new alerts');
    }
    
  } catch (error) {
    logger.error('NWS monitoring failed', { error: error.message });
  }
  
  logger.info('=== NWS Weather Alert Monitoring Complete ===');
}

// Run the monitoring if this script is executed directly
if (import.meta.main) {
  monitorNwsAlerts().catch(error => {
    logger.error('NWS monitoring failed', { error: error.message });
    process.exit(1);
  });
}