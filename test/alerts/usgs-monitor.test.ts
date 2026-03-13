import { describe, it, expect, beforeEach, vi } from 'bun:test';
import { fetchUsgsEarthquakes, saveUsgsEarthquakes, monitorUsgsEarthquakes } from '../../src/alerts/usgs-monitor.ts';
import { createLogger } from '../../src/logger.ts';

// Mock the logger
vi.mock('../../src/logger.ts', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}));

// Mock fetch
global.fetch = vi.fn();

describe('USGS Monitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchUsgsEarthquakes', () => {
    it('should fetch and parse USGS earthquake data correctly', async () => {
      const mockData = {
        "type": "FeatureCollection",
        "metadata": {
          "generated": 1741852800000,
          "url": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson",
          "title": "USGS Earthquakes",
          "status": 200,
          "api": "1.0.8",
          "count": 2
        },
        "features": [
          {
            "type": "Feature",
            "properties": {
              "id": "test1",
              "mag": 4.5,
              "place": "10km W of Crescent City, CA",
              "time": 1741852000000,
              "updated": 1741852100000,
              "tz": null,
              "url": "https://earthquake.usgs.gov/earthquakes/eventpage/test1",
              "detail": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/test1.geojson",
              "felt": null,
              "cdi": null,
              "mmi": null,
              "alert": null,
              "status": "reviewed",
              "tsunami": 0,
              "sig": 123,
              "net": "us",
              "code": "test1",
              "ids": ",test1,",
              "sources": ",us,",
              "types": ",geoserve,origin,",
              "nst": null,
              "dmin": null,
              "rms": null,
              "gap": null,
              "magType": "md",
              "type": "earthquake",
              "title": "M 4.5 - 10km W of Crescent City, CA"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [-124.3, 41.7, 5.0] // [longitude, latitude, depth]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "id": "test2",
              "mag": 3.2,
              "place": "50km off the coast of Oregon",
              "time": 1741851000000,
              "updated": 1741851100000,
              "tz": null,
              "url": "https://earthquake.usgs.gov/earthquakes/eventpage/test2",
              "detail": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/test2.geojson",
              "felt": null,
              "cdi": null,
              "mmi": null,
              "alert": null,
              "status": "reviewed",
              "tsunami": 0,
              "sig": 45,
              "net": "us",
              "code": "test2",
              "ids": ",test2,",
              "sources": ",us,",
              "types": ",geoserve,origin,",
              "nst": null,
              "dmin": null,
              "rms": null,
              "gap": null,
              "magType": "md",
              "type": "earthquake",
              "title": "M 3.2 - 50km off the coast of Oregon"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [-124.5, 42.5, 10.0]
            }
          }
        ]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData)
      });

      const result = await fetchUsgsEarthquakes();

      expect(fetch).toHaveBeenCalledWith('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson');
      expect(result).toHaveLength(1); // Only the first one should be within 200km and >=4.0 magnitude
      expect(result[0]).toMatchObject({
        id: 'test1',
        magnitude: 4.5,
        place: '10km W of Crescent City, CA',
        title: 'M 4.5 - 10km W of Crescent City, CA',
        longitude: -124.3,
        latitude: 41.7,
        depth: 5.0,
        tsunami: 0
      });
      // Check that distance was calculated and added
      expect(result[0].distanceKm).toBeLessThan(200);
    });

    it('should handle HTTP errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await fetchUsgsEarthquakes();

      expect(fetch).toHaveBeenCalledWith('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson');
      expect(result).toHaveLength(0);
    });

    it('should filter by distance and magnitude correctly', async () => {
      const mockData = {
        "type": "FeatureCollection",
        "features": [
          {
            "type": "Feature",
            "properties": {
              "id": "close-quake",
              "mag": 5.0,
              "place": "Very close",
              "time": 1741852000000,
              "updated": 1741852100000,
              "tz": null,
              "url": "",
              "detail": "",
              "felt": null,
              "cdi": null,
              "mmi": null,
              "alert": null,
              "status": "reviewed",
              "tsunami": 0,
              "sig": 100,
              "net": "us",
              "code": "close-quake",
              "ids": "",
              "sources": "",
              "types": "",
              "nst": null,
              "dmin": null,
              "rms": null,
              "gap": null,
              "magType": "md",
              "type": "earthquake",
              "title": "M 5.0 - Very close"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [-124.2, 41.8, 0.0] // Very close to Crescent City
            }
          },
          {
            "type": "Feature",
            "properties": {
              "id": "far-quake",
              "mag": 6.0,
              "place": "Very far",
              "time": 1741851000000,
              "updated": 1741851100000,
              "tz": null,
              "url": "",
              "detail": "",
              "felt": null,
              "cdi": null,
              "mmi": null,
              "alert": null,
              "status": "reviewed",
              "tsunami": 0,
              "sig": 200,
              "net": "us",
              "code": "far-quake",
              "ids": "",
              "sources": "",
              "types": "",
              "nst": null,
              "dmin": null,
              "rms": null,
              "gap": null,
              "magType": "md",
              "type": "earthquake",
              "title": "M 6.0 - Very far"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [-80.0, 25.0, 0.0] // Far away (Florida)
            }
          },
          {
            "type": "Feature",
            "properties": {
              "id": "weak-quake",
              "mag": 3.5,
              "place": "Weak but close",
              "time": 1741850000000,
              "updated": 1741850100000,
              "tz": null,
              "url": "",
              "detail": "",
              "felt": null,
              "cdi": null,
              "mmi": null,
              "alert": null,
              "status": "reviewed",
              "tsunami": 0,
              "sig": 50,
              "net": "us",
              "code": "weak-quake",
              "ids": "",
              "sources": "",
              "types": "",
              "nst": null,
              "dmin": null,
              "rms": null,
              "gap": null,
              "magType": "md",
              "type": "earthquake",
              "title": "M 3.5 - Weak but close"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [-124.1, 41.9, 0.0] // Close but weak magnitude
            }
          }
        ]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData)
      });

      const result = await fetchUsgsEarthquakes();

      expect(result).toHaveLength(1); // Only the close quake with mag >= 4.0
      expect(result[0].id).toBe('close-quake');
    });
  });

  describe('saveUsgsEarthquakes', () => {
    it('should save USGS earthquakes to a JSON file', async () => {
      const fsMock = {
        mkdir: vi.fn(),
        writeFile: vi.fn()
      };
      vi.mock('fs/promises', () => fsMock);
      const pathMock = {
        join: (...args: string[]) => args.join('/')
      };
      vi.mock('path', () => pathMock);

      const earthquakes = [
        {
          id: 'test-quake',
          magnitude: 4.5,
          place: 'Test Place',
          time: 1741852000000,
          updated: 1741852100000,
          tz: null,
          url: 'http://example.com/test',
          detail: '',
          felt: null,
          cdi: null,
          mmi: null,
          alert: null,
          status: 'reviewed',
          tsunami: 0,
          sig: 100,
          net: 'us',
          code: 'test-quake',
          ids: '',
          sources: '',
          types: '',
          nst: null,
          dmin: null,
          rms: null,
          gap: null,
          magType: 'md',
          type: 'earthquake',
          title: 'M 4.5 - Test Place',
          longitude: -124.2,
          latitude: 41.8,
          depth: 5.0,
          distanceKm: 10.5,
          fetchedAt: '2026-03-13T12:00:00.000Z'
        }
      ];

      await saveUsgsEarthquakes(earthquakes);

      expect(fsMock.mkdir).toHaveBeenCalledWith(expect.anything(), { recursive: true });
      expect(fsMock.writeFile).toHaveBeenCalled();
    });
  });

  describe('monitorUsgsEarthquakes', () => {
    it('should run the monitoring process', async () => {
      // Mock fetchUsgsEarthquakes to return some earthquakes
      vi.spyOn(require('../../src/alerts/usgs-monitor.ts'), 'fetchUsgsEarthquakes').mockResolvedValue([
        {
          id: 'test-quake',
          magnitude: 4.5,
          place: 'Test Place',
          time: 1741852000000,
          updated: 1741852100000,
          tz: null,
          url: 'http://example.com/test',
          detail: '',
          felt: null,
          cdi: null,
          mmi: null,
          alert: null,
          status: 'reviewed',
          tsunami: 0,
          sig: 100,
          net: 'us',
          code: 'test-quake',
          ids: '',
          sources: '',
          types: '',
          nst: null,
          dmin: null,
          rms: null,
          gap: null,
          magType: 'md',
          type: 'earthquake',
          title: 'M 4.5 - Test Place',
          longitude: -124.2,
          latitude: 41.8,
          depth: 5.0,
          distanceKm: 10.5
        }
      ]);

      await monitorUsgsEarthquakes();
      
      // Check that fetchUsgsEarthquakes was called
      expect(require('../../src/alerts/usgs-monitor.ts').fetchUsgsEarthquakes).toHaveBeenCalledTimes(1);
      expect(true).toBe(true);
    });
  });
});