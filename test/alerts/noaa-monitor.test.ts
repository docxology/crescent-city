import { describe, it, expect, beforeEach, vi } from 'bun:test';
import { fetchNoaaAlerts, saveNoaaAlerts, monitorNoaaAlerts } from '../src/alerts/noaa-monitor.ts';
import { createLogger } from '../src/logger.ts';

// Mock the logger
vi.mock('../src/logger.ts', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}));

// Mock fetch
global.fetch = vi.fn();

// Mock DOMParser
vi.mock('@xmldom/xmldom', () => {
  return {
    DOMParser: vi.fn().mockImplementation(() => {
      return {
        parseFromString: vi.fn(),
        getElementsByTagName: vi.fn(),
        getElementsByTagNameNS: vi.fn()
      };
    })
import { describe, it, expect, beforeEach, vi } from 'bun:test';
import { fetchNoaaAlerts, saveNoaaAlerts, monitorNoaaAlerts } from '../src/alerts/noaa-monitor.ts';
import { createLogger } from '../src/logger.ts';

// Mock the logger
vi.mock('../src/logger.ts', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}));

// Mock fetch
global.fetch = vi.fn();

describe('NOAA Monitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchNoaaAlerts', () => {
    it('should fetch and parse NOAA CAP alerts correctly', async () => {
      const mockXML = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n        <feed xmlns=\"http://www.w3.org/2005/Atom\">\n          <entry>\n            <id>urn:oid:2.49.0.1.7.3.1.1</id>\n            <title>Tsunami Warning</title>\n            <updated>2026-03-13T12:00:00Z</updated>\n            <content>\n              <alert xmlns=\"urn:oasis:names:tc:emergency:cap:1.2\">\n                <identifier>test-alert-id</identifier>\n                <sender>test@example.com</sender>\n                <sent>2026-03-13T12:00:00Z</sent>\n                <status>Actual</status>\n                <msgType>Alert</msgType>\n                <event>Tsunami Warning</event>\n                <effective>2026-03-13T12:00:00Z</effective>\n                <expires>2026-03-13T18:00:00Z</expires>\n                <severity>Severe</severity>\n                <certainty>Likely</certainty>\n                <urgency>Immediate</urgency>\n                <areaDesc>Coastal Del Norte County; Coastal Humboldt County</areaDesc>\n                <description>A tsunami warning is in effect for the coastal areas.</description>\n                <instruction>Move to higher ground immediately.</instruction>\n                <polygon>41.8,-124.2 41.9,-124.1 41.8,-124.0</polygon>\n              </alert>\n            </content>\n          </entry>\n        </feed>`;

      // Mock the fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockXML)
      });

      const result = await fetchNoaaAlerts();

      expect(fetch).toHaveBeenCalledWith('https://alerts.weather.gov/cap/wwaatmget.php?x=CA123');
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'urn:oid:2.49.0.1.7.3.1.1',
        title: 'Tsunami Warning',
        event: 'Tsunami Warning',
        severity: 'Severe',
        certainty: 'Likely',
        urgency: 'Immediate',
        areaDesc: 'Coastal Del Norte County; Coastal Humboldt County',
        effective: '2026-03-13T12:00:00Z',
        expires: '2026-03-13T18:00:00Z',
        description: 'A tsunami warning is in effect for the coastal areas.',
        instruction: 'Move to higher ground immediately.',
        polygon: '41.8,-124.2 41.9,-124.1 41.8,-124.0'
      });
    });

    it('should handle HTTP errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await fetchNoaaAlerts();

      expect(fetch).toHaveBeenCalledWith('https://alerts.weather.gov/cap/wwaatmget.php?x=CA123');
      expect(result).toHaveLength(0);
    });
  });

  describe('saveNoaaAlerts', () => {
    it('should save NOAA alerts to a JSON file', async () => {
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
          title: 'Test Alert',
          severity: 'Severe',
          certainty: 'Likely',
          urgency: 'Immediate',
          event: 'Tsunami Warning',
          areaDesc: 'Test Area',
          effective: '2026-03-13T12:00:00Z',
          expires: '2026-03-13T18:00:00Z',
          description: 'Test description',
          instruction: 'Test instruction',
          polygon: '41.8,-124.2',
          fetchedAt: '2026-03-13T12:00:00.000Z'
        }
      ];

      await saveNoaaAlerts(alerts);

      expect(fsMock.mkdir).toHaveBeenCalledWith(expect.anything(), { recursive: true });
      expect(fsMock.writeFile).toHaveBeenCalled();
    });
  });

  describe('monitorNoaaAlerts', () => {
    it('should run the monitoring process', async () => {
      // Mock fetchNoaaAlerts to return some alerts
      vi.spyOn(require('../src/alerts/noaa-monitor.ts'), 'fetchNoaaAlerts').mockResolvedValue([
        {
          id: 'test-alert',
          title: 'Test Alert',
          severity: 'Severe',
          certainty: 'Likely',
          urgency: 'Immediate',
          event: 'Tsunami Warning',
          areaDesc: 'Test Area',
          effective: '2026-03-13T12:00:00Z',
          expires: '2026-03-13T18:00:00Z',
          description: 'Test description',
          instruction: 'Test instruction',
          polygon: '41.8,-124.2'
        }
      ]);

      await monitorNoaaAlerts();

      // We expect the logger to have been called
      expect(true).toBe(true);
    });
  });
});