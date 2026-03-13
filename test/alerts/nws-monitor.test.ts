import { describe, it, expect, beforeEach, vi } from 'bun:test';
import { fetchNwsAlerts, saveNwsAlerts, monitorNwsAlerts } from '../../src/alerts/nws-monitor.ts';
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

describe('NWS Monitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchNwsAlerts', () => {
    it('should fetch and parse NWS weather alerts correctly', async () => {
      const mockData = {
        "type": "FeatureCollection",
        "features": [
          {
            "type": "Feature",
            "id": "https://api.weather.gov/alerts/test1",
            "properties": {
              "id": "https://api.weather.gov/alerts/test1",
              "areaDesc": "Coastal Del Norte County; Coastal Humboldt County",
              "event": "Coastal Flood Warning",
              "severity": "Severe",
              "certainty": "Likely",
              "urgency": "Immediate",
              "effective": "2026-03-13T12:00:00-08:00",
              "expires": "2026-03-13T18:00:00-08:00",
              "sender": "w-webmaster@hfg.noaa.gov",
              "description": "...COASTAL FLOOD WARNING IN EFFECT UNTIL 6 PM PDT THIS EVENING...",
              "instruction": "Move to higher ground immediately.",
              "parameters": {
                "VTEC": [
                  "/O.NEW.KFGZ.FL.W.0001.000000T0000Z-000000T0000Z/"
                ]
              }
            },
            "geometry": {
              "type": "Polygon",
              "coordinates": [[
                [-124.2, 41.8],
                [-124.0, 41.8],
                [-124.0, 42.0],
                [-124.2, 42.0],
                [-124.2, 41.8]
              ]]
            }
          },
          {
            "type": "Feature",
            "id": "https://api.weather.gov/alerts/test2",
            "properties": {
              "id": "https://api.weather.gov/alerts/test2",
              "areaDesc": "Inland Del Norte County",
              "event": "Winter Weather Advisory",
              "severity": "Moderate",
              "certainty": "Likely",
              "urgency": "Expected",
              "effective": "2026-03-13T12:00:00-08:00",
              "expires": "2026-03-14T12:00:00-08:00",
              "sender": "w-webmaster@hfg.noaa.gov",
              "description": "...WINTER WEATHER ADVISORY IN EFFECT FROM 6 PM THIS EVENING TO 6 PM PST THURSDAY...",
              "instruction": "Drive slowly and use caution.",
              "parameters": {
                "VTEC": [
                  "/O.NEW.KFGZ.WW.Y.0002.000000T0000Z-000000T0000Z/"
                ]
              }
            },
            "geometry": {
              "type": "Polygon",
              "coordinates": [[
                [-124.0, 41.5],
                [-123.5, 41.5],
                [-123.5, 42.0],
                [-124.0, 42.0],
                [-124.0, 41.5]
              ]]
            }
          }
        ]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData)
      });

      const result = await fetchNwsAlerts();

      expect(fetch).toHaveBeenCalledWith('https://api.weather.gov/alerts/active?zone=CAZ006&status=actual&message_type=alert', {
        headers: {
          'User-Agent': 'CrescentCityIntelligenceSystem/1.0 (https://github.com/docxology/crescent-city)'
        }
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'https://api.weather.gov/alerts/test1',
        areaDesc: 'Coastal Del Norte County; Coastal Humboldt County',
        event: 'Coastal Flood Warning',
        severity: 'Severe',
        certainty: 'Likely',
        urgency: 'Immediate',
        effective: '2026-03-13T12:00:00-08:00',
        expires: '2026-03-13T18:00:00-08:00',
        sender: 'w-webmaster@hfg.noaa.gov',
        description: expect.stringContaining('COASTAL FLOOD WARNING'),
        instruction: 'Move to higher ground immediately.',
        parameters: expect.objectContaining({
          VTEC: expect.arrayContaining([
            '/O.NEW.KFGZ.FL.W.0001.000000T0000Z-000000T0000Z/'
          ])
        }),
        polygon: JSON.stringify([[
          [-124.2, 41.8],
          [-124.0, 41.8],
          [-124.0, 42.0],
          [-124.2, 42.0],
          [-124.2, 41.8]
        ]])
      });
      expect(result[1]).toMatchObject({
        id: 'https://api.weather.gov/alerts/test2',
        areaDesc: 'Inland Del Norte County',
        event: 'Winter Weather Advisory',
        severity: 'Moderate',
        certainty: 'Likely',
        urgency: 'Expected',
        effective: '2026-03-13T12:00:00-08:00',
        expires: '2026-03-14T12:00:00-08:00',
        sender: 'w-webmaster@hfg.noaa.gov',
        description: expect.stringContaining('WINTER WEATHER ADVISORY'),
        instruction: 'Drive slowly and use caution.',
        parameters: expect.objectContaining({
          VTEC: expect.arrayContaining([
            '/O.NEW.KFGZ.WW.Y.0002.000000T0000Z-000000T0000Z/'
          ])
        }),
        polygon: JSON.stringify([[
          [-124.0, 41.5],
          [-123.5, 41.5],
          [-123.5, 42.0],
          [-124.0, 42.0],
          [-124.0, 41.5]
        ]])
      });
    });

    it('should handle HTTP errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await fetchNwsAlerts();

      expect(fetch).toHaveBeenCalledWith('https://api.weather.gov/alerts/active?zone=CAZ006&status=actual&message_type=alert', {
        headers: {
          'User-Agent': 'CrescentCityIntelligenceSystem/1.0 (https://github.com/docxology/crescent-city)'
        }
      });
      expect(result).toHaveLength(0);
    });
  });

  describe('saveNwsAlerts', () => {
    it('should save NWS alerts to a JSON file', async () => {
      const fsMock = {
        mkdir: vi.fn(),
        writeFile: vi.fn()
      };
      vi.mock('fs/promises', () => fsMock);
      const pathMock = {
        join: (...args: string[]) => args.join('/')
      };
      vi.mock('path', () => pathMock);

      const alerts = [
        {
          id: 'test-alert',
          areaDesc: 'Test Area',
          event: 'Test Event',
          severity: 'Severe',
          certainty: 'Likely',
          urgency: 'Immediate',
          effective: '2026-03-13T12:00:00-08:00',
          expires: '2026-03-13T18:00:00-08:00',
          sender: 'test@example.com',
          description: 'Test description',
          instruction: 'Test instruction',
          polygon: '{"coordinates":[[[-124.2,41.8]]]}',
          parameters: {},
          fetchedAt: '2026-03-13T12:00:00.000Z'
        }
      ];

      await saveNwsAlerts(alerts);

      expect(fsMock.mkdir).toHaveBeenCalledWith(expect.anything(), { recursive: true });
      expect(fsMock.writeFile).toHaveBeenCalled();
    });
  });

  describe('monitorNwsAlerts', () => {
    it('should run the monitoring process', async () => {
      // Mock fetchNwsAlerts to return some alerts
      vi.spyOn(require('../../src/alerts/nws-monitor.ts'), 'fetchNwsAlerts').mockResolvedValue([
        {
          id: 'test-alert',
          areaDesc: 'Test Area',
          event: 'Test Event',
          severity: 'Severe',
          certainty: 'Likely',
          urgency: 'Immediate',
          effective: '2026-03-13T12:00:00-08:00',
          expires: '2026-03-13T18:00:00-08:00',
          sender: 'test@example.com',
          description: 'Test description',
          instruction: 'Test instruction',
          polygon: '{"coordinates":[[[-124.2,41.8]]]}',
          parameters: {}
        }
      ]);

      await monitorNwsAlerts();
      
      // Check that fetchNwsAlerts was called
      expect(require('../../src/alerts/nws-monitor.ts').fetchNwsAlerts).toHaveBeenCalledTimes(1);
      expect(true).toBe(true);
    });
  });
});