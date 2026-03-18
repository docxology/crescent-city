#!/usr/bin/env bun
/**
 * NWS Weather Alert Processing for Crescent City.
 * Monitors National Weather Service alerts for coastal flood, high wind, and storm warnings,
 * parses polygon-affected areas for Crescent City specificity, categorizes by severity 
 * (advisory, watch, warning), and stores in output/alerts/weather/ with standardized format.
 */
import { createLogger } from '../logger.js';
import { computeSha256 } from '../utils.js';
import { appendFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const logger = createLogger('nws_weather_alert');

// NWS API endpoint for active alerts in California (specifically for Northwest CA zone)
const NWS_ALERTS_URL = 'https://api.weather.gov/alerts/active?region=CA&zone=CAZ006'; // CAZ006 is Northwest CA coastal zone

const CRESCENT_CITY_LAT = 41.7485;
const CRESCENT_CITY_LNG = -124.2028;

// Persistent alert history JSONL path
const HISTORY_DIR = join(process.cwd(), 'output', 'alerts', 'weather');
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

/** Append a new weather alert to the persistent JSONL history log */
function appendWeatherHistory(alert: any, severityLevel: string): void {
  try {
    mkdirSync(HISTORY_DIR, { recursive: true });
    const record = JSON.stringify({
      id: alert.id,
      event: alert.event,
      severity: alert.severity,
      certainty: alert.certainty,
      urgency: alert.urgency,
      severityLevel,
      effective: alert.effective,
      expires: alert.expires,
      headline: alert.headline,
      areaDesc: alert.areaDesc,
      fetchedAt: new Date().toISOString(),
    });
    appendFileSync(HISTORY_FILE, record + '\n', 'utf-8');
  } catch (err) {
    logger.warn('Failed to append weather alert history', { error: String(err) });
  }
}

// Cache to prevent duplicate processing of the same alert (seeded from JSONL history)
const processedAlerts = loadProcessedIds();

/**
 * Interface for NWS alert properties
 */
interface NWSAlertProperties {
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
  response: string;
  onset: string;
  parameters: Record<string, any>;
  geometry?: {
    type: string;
    coordinates: number[][][] | number[][];
  };
}

/**
 * Interface for NWS alert feature
 */
interface NWSAlertFeature {
  type: string;
  properties: NWSAlertProperties;
  geometry: {
    type: string;
    coordinates: number[][][] | number[][];
  } | null;
  id: string;
}

/**
 * Interface for NWS alert response
 */
interface NWSAlertResponse {
  type: string;
  features: NWSAlertFeature[];
}

/**
 * Check if a point is inside a polygon (using ray casting algorithm)
 */
function pointInPolygon(point: { lat: number; lng: number }, polygon: number[][][]): boolean {
  // For simplicity, we'll check if the point is in the bounding box first
  // In a production system, we'd use a proper GIS library
  
  // Extract all coordinates from multi-polygon
  const allCoords: [number, number][] = [];
  for (const polygonPart of polygon) {
    for (const coord of polygonPart) {
      // GeoJSON coordinates are [longitude, latitude]
      allCoords.push([coord[0], coord[1]]);
    }
  }
  
  if (allCoords.length === 0) return false;
  
  // Bounding box check
  let minLng = allCoords[0][0];
  let maxLng = allCoords[0][0];
  let minLat = allCoords[0][1];
  let maxLat = allCoords[0][1];
  
  for (const [lng, lat] of allCoords) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  
  const pointLng = point.lng;
  const pointLat = point.lat;
  
  if (pointLng < minLng || pointLng > maxLng || pointLat < minLat || pointLat > maxLat) {
    return false;
  }
  
  // Simple point-in-polygon check (ray casting algorithm)
  let inside = false;
  for (let i = 0, j = allCoords.length - 1; i < allCoords.length; j = i++) {
    const [xi, yi] = allCoords[i];
    const [xj, yj] = allCoords[j];
    
    const intersect = ((yi > pointLat) !== (yj > pointLat)) &&
      (pointLng < (xj - xi) * (pointLat - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Check if an alert affects Crescent City area
 */
function isCrescentCityRelevant(alert: {
  areaDesc: string;
  description: string;
  geometry?: {
    type: string;
    coordinates: number[][][] | number[][];
  } | null;
}): boolean {
  // First check by area description
  const crescentCityKeywords = [
    'crescent city',
    'del norte',
    'california coast',
    'northern california',
    'northwest california',
    'caz006',
    'ca',
    'california',
    'coastal',
    'marine'
  ];
  
  const areaDescLower = alert.areaDesc.toLowerCase();
  const descriptionLower = alert.description.toLowerCase();
  
  if (crescentCityKeywords.some(keyword => 
    areaDescLower.includes(keyword) || descriptionLower.includes(keyword)
  )) {
    return true;
  }
  
  // If we have geometry data, do a more precise check
  if (alert.geometry && alert.geometry.coordinates) {
    try {
      const point = { lat: CRESCENT_CITY_LAT, lng: CRESCENT_CITY_LNG };
      
      // Handle both polygon and multipolygon geometries
      const coordinates = alert.geometry.coordinates;
      const polygons = alert.geometry.type === 'MultiPolygon' 
        ? (coordinates as number[][][]) 
        : [coordinates as number[][]];
      
      for (const polygon of polygons) {
        if (pointInPolygon(point, polygon)) {
          return true;
        }
      }
    } catch (e) {
      // If geometry parsing fails, fall back to area description check
      logger.warn('Geometry parsing failed, falling back to area description check', { error: (e as Error).message });
    }
  }
  
  return false;
}

/**
 * Determine alert severity level for categorization
 */
function getAlertSeverityLevel(severity: string, certainty: string, urgency: string): 'advisory' | 'watch' | 'warning' {
  // Map NWS severity/certainty/urgency to our categories
  const severityLower = severity.toLowerCase();
  const certaintyLower = certainty.toLowerCase();
  const urgencyLower = urgency.toLowerCase();
  
  // Warning: Severe, Moderate severity with Likely/Very Likely certainty and Immediate/Expected urgency
  if (
    severityLower === 'severe' ||
    (severityLower === 'moderate' && 
     (certaintyLower === 'likely' || certaintyLower === 'very likely') &&
     (urgencyLower === 'immediate' || urgencyLower === 'expected'))
  ) {
    return 'warning';
  }
  
  // Watch: Moderate severity with Possible/Likely certainty and Future urgency, or Minor severity with Likely/Very Likely certainty
  if (
    (severityLower === 'moderate' && 
     (certaintyLower === 'possible' || certaintyLower === 'likely') &&
     urgencyLower === 'future') ||
    (severityLower === 'minor' && 
     (certaintyLower === 'likely' || certaintyLower === 'very likely'))
  ) {
    return 'watch';
  }
  
  // Advisory: Everything else (Minor severity with Possible certainty, etc.)
  return 'advisory';
}

/**
 * Save alert to file for historical tracking
 */
async function saveAlertToFile(alert: any, severityLevel: 'advisory' | 'watch' | 'warning'): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const dataDir = path.join(process.cwd(), 'output', 'alerts', 'weather', severityLevel);
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (e) {
    // Directory might already exist
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const alertIdSafe = alert.id.replace(/[^\w\-]/g, '_');
  const filename = path.join(dataDir, `alert-${alertIdSafe}-${timestamp}.json`);
  
  const alertData = {
    fetchedAt: new Date().toISOString(),
    alert: alert,
    severityLevel: severityLevel
  };
  
  await fs.writeFile(filename, JSON.stringify(alertData, null, 2));
  logger.info(`Saved NWS weather alert to ${filename}`);
}

/**
 * Main NWS weather alert monitoring function.
 * Exported for use by thin orchestrator scripts.
 */
export async function monitorNWSWeatherAlerts(): Promise<void> {
  logger.info('=== Starting NWS Weather Alert Monitoring ===');
  
  try {
    const response = await fetch(NWS_ALERTS_URL, {
      headers: {
        'User-Agent': 'CrescentCityIntelligenceSystem/1.0 (https://github.com/docxology/crescent-city)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data: NWSAlertResponse = await response.json();
    
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
        response: feature.properties.response,
        onset: feature.properties.onset,
        parameters: feature.properties.parameters,
        geometry: feature.geometry
      }));
    
    logger.info(`Found ${alerts.length} active NWS alerts`, { count: alerts.length });
    
    let newAlertsCount = 0;
    const advisoryCount = { advisory: 0, watch: 0, warning: 0 };
    
    for (const alert of alerts) {
      // Skip if we've already processed this alert
      if (processedAlerts.has(alert.id)) {
        continue;
      }
      
      // Check if alert is relevant to Crescent City
      if (!isCrescentCityRelevant(alert)) {
        logger.info(`Skipping non-relevant NWS alert: ${alert.headline}`, {
          area: alert.areaDesc,
          event: alert.event,
          severity: alert.severity
        });
        processedAlerts.add(alert.id); // Still mark as processed to avoid re-checking
        continue;
      }
      
      // Mark as processed
      processedAlerts.add(alert.id);
      newAlertsCount++;
      
      // Determine severity level for categorization
      const severityLevel = getAlertSeverityLevel(alert.severity, alert.certainty, alert.urgency);
      advisoryCount[severityLevel]++;

      // Persist to JSONL history
      appendWeatherHistory(alert, severityLevel);

      // Log based on severity level
      let logLevel = 'info';
      if (severityLevel === 'warning') logLevel = 'warning';
      if (severityLevel === 'watch') logLevel = 'warn';

      logger.log(
        logLevel,
        `NEW NWS WEATHER ALERT FOR CRESCENT CITY (${severityLevel.toUpperCase()})`,
        {
          id: alert.id,
          event: alert.event,
          severity: alert.severity,
          certainty: alert.certainty,
          urgency: alert.urgency,
          effective: alert.effective,
          expires: alert.expires,
          area: alert.areaDesc,
          headline: alert.headline,
          severityLevel
        }
      );

      // Save alert to file
      await saveAlertToFile(alert, severityLevel);
      
      // TODO: Trigger automated notifications via existing monitoring channels
      logger.info('Would trigger automated notifications (email, SMS, dashboard update, etc.)', {
        alertId: alert.id,
        severityLevel
      });
    }
    
    if (newAlertsCount === 0) {
      logger.info('No new relevant NWS weather alerts found');
    } else {
      logger.info(`Processed ${newAlertsCount} new relevant NWS weather alerts:`, {
        advisory: advisoryCount.advisory,
        watch: advisoryCount.watch,
        warning: advisoryCount.warning
      });
    }
    
  } catch (error) {
    logger.error('Failed to fetch NWS weather alerts', { error: error.message });
  }
  
  logger.info('=== NWS Weather Alert Monitoring Complete ===');
}

// Run the monitoring if this script is executed directly
if (import.meta.main) {
  monitorNWSWeatherAlerts().catch(error => {
    logger.error('NWS weather alert monitoring failed', { error: error.message });
    process.exit(1);
  });
}