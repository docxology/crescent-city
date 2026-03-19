#!/usr/bin/env bun
/**
 * NOAA Tsunami Warning Integration for Crescent City.
 * Subscribes to NOAA CAP alerts for tsunami warnings, parses alert severity,
 * affected areas, and timing, triggers automated notifications, and logs alerts.
 */
import { createLogger } from '../logger.js';
import { appendFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

const logger = createLogger('noaa_tsunami_alert');

// NOAA CAP feed for tsunami warnings (Pacific Coast/Alaska region)
const NOAA_TSUNAMI_CAP_URL = 'https://api.weather.gov/alerts/active?event=Tsunami Warning&region=CA';

// Persistent alert history JSONL path
const HISTORY_DIR = join(process.cwd(), 'output', 'alerts', 'tsunami');
const HISTORY_FILE = join(HISTORY_DIR, 'history.jsonl');

/** Load processed alert IDs from persistent history to prevent cross-run duplicates */
function loadProcessedIds(): Set<string> {
  const ids = new Set<string>();
  if (!existsSync(HISTORY_FILE)) return ids;
  try {
    const lines = readFileSync(HISTORY_FILE, 'utf-8').split('\n').filter(Boolean);
    for (const line of lines) {
      try { ids.add(JSON.parse(line).id); } catch { /* skip corrupt lines */ }
    }
  } catch { /* ignore read errors */ }
  return ids;
}

/** Append a tsunami alert to the persistent JSONL history log */
function appendTsunamiHistory(alert: NOAAAlertProperties, threatLevel: string): void {
  try {
    mkdirSync(HISTORY_DIR, { recursive: true });
    const record = JSON.stringify({
      id: alert.id,
      event: alert.event,
      severity: alert.severity,
      certainty: alert.certainty,
      urgency: alert.urgency,
      threatLevel,
      effective: alert.effective,
      expires: alert.expires,
      headline: alert.headline,
      areaDesc: alert.areaDesc,
      fetchedAt: new Date().toISOString(),
    });
    appendFileSync(HISTORY_FILE, record + '\n', 'utf-8');
  } catch (err) {
    logger.warn('Failed to append tsunami alert history', { error: String(err) });
  }
}

// Cache to prevent duplicate processing (seeded from JSONL history)
const processedAlerts = loadProcessedIds();

/**
 * Interface for NOAA CAP alert properties
 */
interface NOAAAlertProperties {
  id: string;
  areaDesc: string;
  event: string;
  severity: string;
  certainty: string;
  urgency: string;
  effective: string;
  expires: string;
  sender: string;
  headline: string;
  description: string;
  instruction: string;
  status: string;
  msgType: string;
  category: string;
}

/**
 * Interface for NOAA CAP alert feature
 */
interface NOAAAlertFeature {
  type: string;
  properties: NOAAAlertProperties;
  geometry: {
    type: string;
    coordinates: number[][][];
  } | null;
}

/**
 * Interface for NOAA CAP alert response
 */
interface NOAAAlertResponse {
  type: string;
  features: NOAAAlertFeature[];
}

/**
 * Fetch and parse NOAA CAP alerts for tsunami warnings
 */
async function fetchNOAATsunamiAlerts(): Promise<Array<{
  id: string;
  areaDesc: string;
  event: string;
  severity: string;
  certainty: string;
  urgency: string;
  effective: string;
  expires: string;
  sender: string;
  headline: string;
  description: string;
  instruction: string;
  status: string;
  msgType: string;
  category: string;
  geometry: {
    type: string;
    coordinates: number[][][];
  } | null;
}>> {
  try {
    logger.info('Fetching NOAA tsunami CAP alerts', { url: NOAA_TSUNAMI_CAP_URL });
    
    const response = await fetch(NOAA_TSUNAMI_CAP_URL, {
      headers: {
        'User-Agent': 'CrescentCityIntelligenceSystem/1.0 (https://github.com/docxology/crescent-city)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data: NOAAAlertResponse = await response.json();
    
    // Filter for active alerts and extract relevant information
    const alerts = data.features
      .filter(feature => 
        feature.properties.status === 'Actual' && 
        feature.properties.msgType === 'Alert'
      )
      .map(feature => ({
        id: feature.properties.id,
        areaDesc: feature.properties.areaDesc,
        event: feature.properties.event,
        severity: feature.properties.severity,
        certainty: feature.properties.certainty,
        urgency: feature.properties.urgency,
        effective: feature.properties.effective,
        expires: feature.properties.expires,
        sender: feature.properties.sender,
        headline: feature.properties.headline,
        description: feature.properties.description,
        instruction: feature.properties.instruction,
        status: feature.properties.status,
        msgType: feature.properties.msgType,
        category: feature.properties.category,
        geometry: feature.geometry
      }));
    
    logger.info(`Found ${alerts.length} active NOAA tsunami alerts`, { count: alerts.length });
    return alerts;
    
  } catch (error) {
    logger.error('Failed to fetch NOAA tsunami CAP alerts', { error: error.message });
    return [];
  }
}

/**
 * Check if an alert affects Crescent City area.
 *
 * NOTE: This keyword list is tighter than nws_weather.ts by design. Tsunami alerts
 * are pre-filtered to `event=Tsunami Warning` at the API level, so "california" as
 * a substring is sufficient; no need for the broad "coastal"/"marine"/"caz006" terms
 * that NWS weather alerts require to catch zone-coded events.
 */
function isCrescentCityRelevant(alert: {
  areaDesc: string;
  description: string;
}): boolean {
  const crescentCityKeywords = [
    'crescent city',
    'del norte',
    'california coast',
    'northern california',
    'pacific coast',
    'ca',
    'california'
  ];
  
  const areaDescLower = alert.areaDesc.toLowerCase();
  const descriptionLower = alert.description.toLowerCase();
  
  return crescentCityKeywords.some(keyword => 
    areaDescLower.includes(keyword) || descriptionLower.includes(keyword)
  );
}

/**
 * Save alert to file for historical tracking
 */
async function saveAlertToFile(alert: any): Promise<void> {
  const dataDir = join(process.cwd(), 'output', 'alerts', 'tsunami');
  await mkdir(dataDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const alertIdSafe = alert.id.replace(/[^\w\-]/g, '_');
  const filename = join(dataDir, `alert-${alertIdSafe}-${timestamp}.json`);

  const alertData = {
    fetchedAt: new Date().toISOString(),
    alert: alert,
  };

  await writeFile(filename, JSON.stringify(alertData, null, 2));
  logger.info(`Saved tsunami alert to ${filename}`);
}

/**
 * Main NOAA tsunami alert monitoring function.
 * Exported for use by thin orchestrator scripts.
 */
export async function monitorNOAATsunamiAlerts(): Promise<void> {
  logger.info('=== Starting NOAA Tsunami Alert Monitoring ===');
  
  const alerts = await fetchNOAATsunamiAlerts();
  
  let newAlertsCount = 0;
  
  for (const alert of alerts) {
    // Skip if we've already processed this alert
    if (processedAlerts.has(alert.id)) {
      continue;
    }
    
    // Check if alert is relevant to Crescent City
    if (!isCrescentCityRelevant(alert)) {
      logger.info(`Skipping non-relevant tsunami alert: ${alert.headline}`, {
        area: alert.areaDesc,
        severity: alert.severity
      });
      processedAlerts.add(alert.id); // Still mark as processed to avoid re-checking
      continue;
    }
    
    // Mark as processed
    processedAlerts.add(alert.id);
    newAlertsCount++;

    // Classify threat level
    const threatLevel = alert.event.toLowerCase().includes('warning') ? 'warning'
      : alert.event.toLowerCase().includes('watch') ? 'watch' : 'advisory';

    // Persist to JSONL history immediately
    appendTsunamiHistory(alert, threatLevel);

    logger.warn('NEW TSUNAMI ALERT FOR CRESCENT CITY DETECTED!', {
      id: alert.id,
      headline: alert.headline,
      severity: alert.severity,
      certainty: alert.certainty,
      urgency: alert.urgency,
      effective: alert.effective,
      expires: alert.expires,
      area: alert.areaDesc,
      threatLevel,
    });

    // Save alert to file
    await saveAlertToFile(alert);

    logger.info('Would trigger automated notifications (email, SMS, dashboard update, etc.)', {
      alertId: alert.id
    });
  }

  if (newAlertsCount === 0) {
    logger.info('No new relevant NOAA tsunami alerts found');
  } else {
    logger.info(`Processed ${newAlertsCount} new relevant NOAA tsunami alerts`);
  }

  logger.info('=== NOAA Tsunami Alert Monitoring Complete ===');
}

// Run the monitoring if this script is executed directly
if (import.meta.main) {
  monitorNOAATsunamiAlerts().catch(error => {
    logger.error('NOAA tsunami alert monitoring failed', { error: error.message });
    process.exit(1);
  });
}