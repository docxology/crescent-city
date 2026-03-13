#!/usr/bin/env bun
/**
 * USGS earthquake monitoring for Crescent City.
 * Connects to USGS earthquake notification API and filters for relevant events.
 */
import { createLogger } from '../logger.js';

const logger = createLogger('usgs_monitor');

// USGS earthquake feed - all earthquakes, magnitude 1.0+ worldwide, past hour
const USGS_EARTHQUAKE_FEED = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson';

// Configuration for Crescent City area
const CRESCENT_CITY_LAT = 41.7558;
const CRESCENT_CITY_LNG = -124.2026;
const MAX_DISTANCE_KM = 200; // Within 200km of Crescent City
const MIN_MAGNITUDE = 4.0;   // Minimum magnitude to consider

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Fetch and parse USGS earthquake data
 */
export async function fetchUsgsEarthquakes(): Promise<Array<{
  id: string;
  magnitude: number;
  place: string;
  time: number;
  updated: number;
  tz: string | null;
  url: string;
  detail: string;
  felt: number | null;
  cdi: number | null;
  mmi: number | null;
  alert: string | null;
  status: string;
  tsunami: number; // 0 = no tsunami, 1 = tsunami possible, 2 = tsunami generated
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
  longitude: number;
  latitude: number;
  depth: number;
  distanceKm: number;
}> {
  try {
    logger.info('Fetching USGS earthquake data', { url: USGS_EARTHQUAKE_FEED });
    
    const response = await fetch(USGS_EARTHQUAKE_FEED);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.features || !Array.isArray(data.features)) {
      throw new Error('Invalid USGS earthquake data format');
    }
    
    const earthquakes: Array<{
      id: string;
      magnitude: number;
      place: string;
      time: number;
      updated: number;
      tz: string | null;
      url: string;
      detail: string;
      felt: number | null;
      cdi: number | null;
      mmi: number | null;
      alert: string | null;
      status: string;
      tsunami: number;
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
      longitude: number;
      latitude: number;
      depth: number;
      distanceKm: number;
    }> = [];
    
    for (const feature of data.features) {
      const props = feature.properties;
      const coords = feature.geometry?.coordinates;
      
      if (!props || !coords || coords.length < 2) {
        continue;
      }
      
      const [longitude, latitude, depth = 0] = coords;
      
      // Calculate distance from Crescent City
      const distanceKm = calculateDistance(
        CRESCENT_CITY_LAT, CRESCENT_CITY_LNG,
        latitude, longitude
      );
      
      // Filter by distance and magnitude
      if (distanceKm <= MAX_DISTANCE_KM && props.mag >= MIN_MAGNITUDE) {
        earthquakes.push({
          id: props.id,
          magnitude: props.mag,
          place: props.place,
          time: props.time,
          updated: props.updated,
          tz: props.tz ?? null,
          url: props.url,
          detail: props.detail,
          felt: props.felt ?? null,
          cdi: props.cdi ?? null,
          mmi: props.mmi ?? null,
          alert: props.alert ?? null,
          status: props.status,
          tsunami: props.tsunami ?? 0,
          sig: props.sig,
          net: props.net,
          code: props.code,
          ids: props.ids,
          sources: props.sources,
          types: props.types,
          nst: props.nst ?? null,
          dmin: props.dmin ?? null,
          rms: props.rms ?? null,
          gap: props.gap ?? null,
          magType: props.magType,
          type: props.type,
          title: props.title,
          longitude,
          latitude,
          depth: Math.abs(depth), // Ensure depth is positive
          distanceKm
        });
      }
    }
    
    // Sort by distance (closest first)
    earthquakes.sort((a, b) => a.distanceKm - b.distanceKm);
    
    logger.info(`Fetched ${earthquakes.length} earthquakes within ${MAX_DISTANCE_KM}km and magnitude >=${MIN_MAGNITUDE}`);
    return earthquakes;
    
  } catch (error) {
    logger.error('Failed to fetch USGS earthquake data', { error: error.message });
    return [];
  }
}

/**
 * Save USGS earthquakes to JSON file for historical tracking
 */
export async function saveUsgsEarthquakes(earthquakes: Array<{
  id: string;
  magnitude: number;
  place: string;
  time: number;
  updated: number;
  tz: string | null;
  url: string;
  detail: string;
  felt: number | null;
  cdi: number | null;
  mmi: number | null;
  alert: string | null;
  status: string;
  tsunami: number;
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
  longitude: number;
  latitude: number;
  depth: number;
  distanceKm: number;
  fetchedAt: string;
}>): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const dataDir = path.join(process.cwd(), 'output', 'alerts', 'earthquake');
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (e) {
    // Directory might already exist
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(dataDir, `usgs-earthquakes-${timestamp}.json`);
  
  const data = {
    fetchedAt: new Date().toISOString(),
    totalEarthquakes: earthquakes.length,
    earthquakes: earthquakes
  };
  
  await fs.writeFile(filename, JSON.stringify(data, null, 2));
  logger.info(`Saved USGS earthquake data to ${filename}`);
}

/**
 * Main USGS monitoring function
 */
export async function monitorUsgsEarthquakes(): Promise<void> {
  logger.info('=== Starting USGS Earthquake Monitoring ===');
  
  try {
    const earthquakes = await fetchUsgsEarthquakes();
    
    if (earthquakes.length > 0) {
      // Add fetched timestamp to each earthquake
      const earthquakesWithTimestamp = earthquakes.map(eq => ({
        ...eq,
        fetchedAt: new Date().toISOString()
      }));
      
      await saveUsgsEarthquakes(earthquakesWithTimestamp);
      
      logger.info(`USGS monitoring complete: ${earthquakes.length} relevant earthquakes processed`);
      
      // Log significant earthquakes (tsunami potential or magnitude >=5.0)
      const significantQuakes = earthquakes.filter(eq => 
        eq.tsunami === 1 || eq.tsunami === 2 || eq.magnitude >= 5.0
      );
      
      if (significantQuakes.length > 0) {
        logger.warn(`Significant earthquakes detected: ${significantQuakes.length}`, {
          earthquakes: significantQuakes.map(eq => ({
            id: eq.id,
            magnitude: eq.magnitude,
            place: eq.place,
            time: new Date(eq.time).toISOString(),
            distanceKm: eq.distanceKm.toFixed(1),
            tsunami: eq.tsunami
          }))
        });
      }
    } else {
      logger.info('USGS monitoring complete: No relevant earthquakes');
    }
    
  } catch (error) {
    logger.error('USGS monitoring failed', { error: error.message });
  }
  
  logger.info('=== USGS Earthquake Monitoring Complete ===');
}

// Run the monitoring if this script is executed directly
if (import.meta.main) {
  monitorUsgsEarthquakes().catch(error => {
    logger.error('USGS monitoring failed', { error: error.message });
    process.exit(1);
  });
}