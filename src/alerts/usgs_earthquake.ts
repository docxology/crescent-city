#!/usr/bin/env bun
/**
 * USGS Earthquake Alert Integration for Crescent City.
 * Connects to USGS earthquake notification API, filters for earthquakes near 
 * Crescent City coast (within 200km, >4.0 magnitude), extracts location, 
 * magnitude, depth, and tsunami potential, stores in output/alerts/earthquake/ 
 * with GeoJSON formatting.
 */
import { createLogger } from '../logger.js';
import { computeSha256 } from '../utils.js';
import { appendFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const logger = createLogger('usgs_earthquake_alert');

// USGS Earthquake API for significant earthquakes in the last hour
const USGS_EARTHQUAKE_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_hour.geojson';

// Crescent City approximate coordinates
const CRESCENT_CITY_LAT = 41.7485;
const CRESCENT_CITY_LNG = -124.2028;
const SEARCH_RADIUS_KM = 200;
const MIN_MAGNITUDE = 4.0;

/**
 * Cascadia Subduction Zone approximate boundary polygon.
 * Runs offshore from Cape Mendocino (38°N) to northern Vancouver Island (50°N),
 * extending from the coast (121°W) to ~128°W.
 *
 * Returns true if the earthquake epicenter falls within this zone.
 * Used to flag potential plate-boundary megaquakes that could generate
 * tsunamis affecting Crescent City.
 */
function isCascadiaEvent(lat: number, lng: number): boolean {
  return lat >= 38.0 && lat <= 50.0 && lng >= -128.5 && lng <= -121.0;
}

// Persistent alert history JSONL path
const HISTORY_DIR = join(process.cwd(), 'output', 'alerts', 'earthquake');
const HISTORY_FILE = join(HISTORY_DIR, 'history.jsonl');

/** Load processed earthquake IDs from persistent history to prevent cross-run duplicates */
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

// Cache to prevent duplicate processing of the same earthquake (seeded from JSONL history)
const processedEarthquakes = loadProcessedIds();

/**
 * Calculate distance between two points using Haversine formula
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Interface for USGS earthquake properties
 */
interface USGSEarthquakeProperties {
  mag: number;
  place: string;
  time: number;
  updated: number;
  tz: number | null;
  url: string;
  detail: string;
  felt: number | null;
  cdi: number | null;
  mmi: number | null;
  alert: string | null;
  status: string;
  tsunami: number; // 0 = no tsunami, 1 = possible tsunami, 2 = tsunami generated
  sig: number;
  net: string;
  code: string;
  ids: string;
  sources: string;
  types: string;
  nst: number | null;
  dmin: number | null;
  rms: number | null;
  gap: number | null;
  magType: string;
  type: string;
  title: string;
}

/**
 * Interface for USGS earthquake feature
 */
interface USGSEarthquakeFeature {
  type: string;
  properties: USGSEarthquakeProperties;
  geometry: {
    type: string;
    coordinates: [number, number, number?]; // longitude, latitude, [depth]
  };
  id: string;
}

/**
 * Interface for USGS earthquake response
 */
interface USGSResponse {
  type: string;
  metadata: {
    generated: number;
    url: string;
    title: string;
    status: number;
    api: string;
    count: number;
  };
  features: USGSEarthquakeFeature[];
}

/**
 * Fetch and parse USGS earthquake data
 */
async function fetchUSGSOverlayEarthquakes(): Promise<Array<{
  id: string;
  magnitude: number;
  place: string;
  time: number;
  updated: number;
  url: string;
  tsunami: number;
  magnitudeType: string;
  latitude: number;
  longitude: number;
  depth: number | null;
  distanceKm: number;
}>> {
  try {
    logger.info('Fetching USGS earthquake data', { url: USGS_EARTHQUAKE_URL });
    
    const response = await fetch(USGS_EARTHQUAKE_URL, {
      headers: {
        'User-Agent': 'CrescentCityIntelligenceSystem/1.0 (https://github.com/docxology/crescent-city)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data: USGSResponse = await response.json();
    
    // Filter for earthquakes that meet our criteria
    const earthquakes = data.features
      .filter(feature => 
        feature.properties.mag >= MIN_MAGNITUDE &&
        feature.geometry && 
        feature.geometry.coordinates.length >= 2
      )
      .map(feature => {
        const coords = feature.geometry.coordinates;
        const longitude = coords[0];
        const latitude = coords[1];
        const depth = coords.length >= 3 ? coords[2] : null;
        
        const distanceKm = haversineDistance(
          CRESCENT_CITY_LAT, CRESCENT_CITY_LNG,
          latitude, longitude
        );
        
        return {
          id: feature.id,
          magnitude: feature.properties.mag,
          place: feature.properties.place,
          time: feature.properties.time,
          updated: feature.properties.updated,
          url: feature.properties.url,
          tsunami: feature.properties.tsunami,
          magnitudeType: feature.properties.magType,
          latitude,
          longitude,
          depth,
          distanceKm
        };
      })
      // Filter by distance from Crescent City
      .filter(eq => eq.distanceKm <= SEARCH_RADIUS_KM)
      // Sort by distance (closest first)
      .sort((a, b) => a.distanceKm - b.distanceKm);
    
    logger.info(`Found ${earthquakes.length} earthquakes meeting criteria (M${MIN_MAGNITUDE}+ within ${SEARCH_RADIUS_KM}km)`, { count: earthquakes.length });
    return earthquakes;
    
  } catch (error) {
    logger.error('Failed to fetch USGS earthquake data', { error: error.message });
    return [];
  }
}

/**
 * Append an earthquake event to the persistent JSONL history log.
 * One line per earthquake: {id, magnitude, place, distanceKm, tsunami, alertLevel, fetchedAt}
 */
function appendEarthquakeHistory(earthquake: any, alertLevel: string): void {
  try {
    mkdirSync(HISTORY_DIR, { recursive: true });
    const cascadia = isCascadiaEvent(earthquake.latitude, earthquake.longitude);
    const record = JSON.stringify({
      id: earthquake.id,
      magnitude: earthquake.magnitude,
      place: earthquake.place,
      distanceKm: Math.round(earthquake.distanceKm * 10) / 10,
      depth: earthquake.depth,
      latitude: earthquake.latitude,
      longitude: earthquake.longitude,
      tsunami: earthquake.tsunami,
      cascadia,
      alertLevel,
      time: new Date(earthquake.time).toISOString(),
      fetchedAt: new Date().toISOString(),
    });
    appendFileSync(HISTORY_FILE, record + '\n', 'utf-8');
  } catch (err) {
    logger.warn('Failed to append earthquake history', { error: String(err) });
  }
}

/**
 * Save earthquake to file for historical tracking
 * @deprecated Use appendEarthquakeHistory for lightweight persistent logging
 */
async function saveEarthquakeToFile(earthquake: any): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');

  const dataDir = path.join(process.cwd(), 'output', 'alerts', 'earthquake');
  try { await fs.mkdir(dataDir, { recursive: true }); } catch {}

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const eqIdSafe = earthquake.id.replace(/[^\w\-]/g, '_');
  const filename = path.join(dataDir, `earthquake-${eqIdSafe}-${timestamp}.json`);

  const geojson = {
    type: "Feature",
    properties: { ...earthquake, fetchedAt: new Date().toISOString() },
    geometry: {
      type: "Point",
      coordinates: [earthquake.longitude, earthquake.latitude, earthquake.depth || 0],
    },
  };
  await fs.writeFile(filename, JSON.stringify({ fetchedAt: new Date().toISOString(), earthquake, geojson }, null, 2));
  logger.info(`Saved earthquake alert to ${filename}`);
}

/**
 * Main USGS earthquake alert monitoring function.
 * Exported for use by thin orchestrator scripts.
 */
export async function monitorUSGSEarthquakeAlerts(): Promise<void> {
  logger.info('=== Starting USGS Earthquake Alert Monitoring ===');
  
  const earthquakes = await fetchUSGSOverlayEarthquakes();
  
  let newEarthquakesCount = 0;
  
  for (const eq of earthquakes) {
    // Skip if we've already processed this earthquake
    if (processedEarthquakes.has(eq.id)) {
      continue;
    }
    
    // Mark as processed
    processedEarthquakes.add(eq.id);
    newEarthquakesCount++;

    // Determine alert level based on magnitude and tsunami potential
    let alertLevel = 'INFO';
    if (eq.magnitude >= 6.0) alertLevel = 'WARNING';
    if (eq.magnitude >= 7.0) alertLevel = 'CRITICAL';
    if (eq.tsunami === 1) alertLevel = 'TSUNAMI_WATCH';
    if (eq.tsunami === 2) alertLevel = 'TSUNAMI_WARNING';

    // Persist to JSONL history immediately
    appendEarthquakeHistory(eq, alertLevel);

    logger.log(
      alertLevel === 'CRITICAL' || alertLevel.includes('TSUNAMI') ? 'warning' : 'info',
      `NEW EARTHQUAKE DETECTED NEAR CRESCENT CITY`,
      {
        id: eq.id,
        magnitude: eq.magnitude,
        place: eq.place,
        depth: eq.depth ? `${eq.depth} km` : 'Unknown depth',
        distance: `${eq.distanceKm.toFixed(1)} km`,
        tsunamiPotential: eq.tsunami === 1 ? 'Possible' : eq.tsunami === 2 ? 'Generated' : 'None',
        alertLevel,
        time: new Date(eq.time).toISOString()
      }
    );

    // Save earthquake to file
    await saveEarthquakeToFile(eq);

    logger.info('Would trigger automated notifications (email, SMS, dashboard update, etc.)', {
      earthquakeId: eq.id
    });
  }
  
  if (newEarthquakesCount === 0) {
    logger.info('No new relevant USGS earthquakes found');
  } else {
    logger.info(`Processed ${newEarthquakesCount} new relevant USGS earthquakes`);
  }
  
  logger.info('=== USGS Earthquake Alert Monitoring Complete ===');
}

// Run the monitoring if this script is executed directly
if (import.meta.main) {
  monitorUSGSEarthquakeAlerts().catch(error => {
    logger.error('USGS earthquake alert monitoring failed', { error: error.message });
    process.exit(1);
  });
}