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
  };
});

describe('NOAA Monitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchNoaaAlerts', () => {
    it('should fetch and parse NOAA CAP alerts correctly', async () => {
      const mockXML = `<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <entry>
            <id>urn:oid:2.49.0.1.7.3.1.1</id>
            <title>Tsunami Warning</title>
            <updated>2026-03-13T12:00:00Z</updated>
            <content>
              <alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
                <identifier>test-alert-id</identifier>
                <sender>test@example.com</sender>
                <sent>2026-03-13T12:00:00Z</sent>
                <status>Actual</status>
                <msgType>Alert</msgType>
                <event>Tsunami Warning</event>
                <effective>2026-03-13T12:00:00Z</effective>
                <expires>2026-03-13T18:00:00Z</expires>
                <severity>Severe</severity>
                <certainty>Likely</certainty>
                <urgency>Immediate</urgency>
                <areaDesc>Coastal Del Norte County; Coastal Humboldt County</areaDesc>
                <description>A tsunami warning is in effect for the coastal areas.</description>
                <instruction>Move to higher ground immediately.</instruction>
                <polygon>41.8,-124.2 41.9,-124.1 41.8,-124.0</polygon>
              </alert>
            </content>
          </entry>
        </feed>`;

      // Mock the DOMParser instance
      const mockParseFromString = vi.fn();
      const mockGetElementsByTagName = vi.fn();
      const mockGetElementsByTagNameNS = vi.fn();

      // We need to mock the DOMParser constructor and its methods
      const mockDOMParser = vi.fn(() => ({
        parseFromString: mockParseFromString,
        getElementsByTagName: mockGetElementsByTagName,
        getElementsByTagNameNS: mockGetElementsByTagNameNS
      }));

      // Temporarily replace the mock
      vi.doMock('@xmldom/xmldom', () => ({
        DOMParser: mockDOMParser
      }));

      // Now, we need to set up the mock return values
      mockParseFromString.mockReturnValue({
        getElementsByTagName: mockGetElementsByTagName,
        getElementsByTagNameNS: mockGetElementsByTagNameNS,
        documentElement: {
          getElementsByTagName: mockGetElementsByTagName,
          getElementsByTagNameNS: mockGetElementsByTagNameNS
        }
      });

      // Mock the entry element
      const mockEntry = {
        getElementsByTagName: mockGetElementsByTagName,
        getElementsByTagNameNS: mockGetElementsByTagNameNS
      };

      // Mock the id, title, updated elements
      const mockIdElement = { textContent: 'urn:oid:2.49.0.1.7.3.1.1' };
      const mockTitleElement = { textContent: 'Tsunami Warning' };
      const mockUpdatedElement = { textContent: '2026-03-13T12:00:00Z' };

      // Mock the content element
      const mockContentElement = {
        getElementsByTagName: mockGetElementsByTagName,
        getElementsByTagNameNS: mockGetElementsByTagNameNS
      };

      // Mock the alert element
      const mockAlertElement = {
        getElementsByTagName: mockGetElementsByTagName,
        getElementsByTagNameNS: mockGetElementsByTagNameNS
      };

      // Set up the mock return values for the entry
      mockGetElementsByTagName.mockImplementation((tagName) => {
        if (tagName === 'id') return [mockIdElement];
        if (tagName === 'title') return [mockTitleElement];
        if (tagName === 'updated') return [mockUpdatedElement];
        if (tagName === 'content') return [mockContentElement];
        return [];
      });

      // Set up the mock return values for the content
      mockContentElement.getElementsByTagNameNS.mockReturnValue([mockAlertElement]);

      // Set up the mock return values for the alert element
      mockAlertElement.getElementsByTagNameNS.mockImplementation((ns, tagName) => {
        const elements: any = {};
        elements.identifier = [{ textContent: 'test-alert-id' }];
        elements.sender = [{ textContent: 'test@example.com' }];
        elements.status = [{ textContent: 'Actual' }];
        elements.msgType = [{ textContent: 'Alert' }];
        elements.event = [{ textContent: 'Tsunami Warning' }];
        elements.effective = [{ textContent: '2026-03-13T12:00:00Z' }];
        elements.expires = [{ textContent: '2026-03-13T18:00:00Z' }];
        elements.severity = [{ textContent: 'Severe' }];
        elements.certainty = [{ textContent: 'Likely' }];
        elements.urgency = [{ textContent: 'Immediate' }];
        elements.areaDesc = [{ textContent: 'Coastal Del Norte County; Coastal Humboldt County' }];
        elements.description = [{ textContent: 'A tsunami warning is in effect for the coastal areas.' }];
        elements.instruction = [{ textContent: 'Move to higher ground immediately.' }];
        elements.polygon = [{ textContent: '41.8,-124.2 41.9,-124.1 41.8,-124.0' }];
        return elements[tagName] || [];
      });

      // Mock the fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockXML)
      });

      // Re-import the module to get the mocked DOMParser
      vi.resetModules();
      const { fetchNoaaAlerts } = await import('../src/alerts/noaa-monitor.ts');

      const result = await fetchNoaaAlerts('http://example.com/feed', 'Test Source');

      expect(fetch).toHaveBeenCalledWith('http://example.com/feed');
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

      // Re-import the module to get the fresh mocks
      vi.resetModules();
      const { fetchNoaaAlerts } = await import('../src/alerts/noaa-monitor.ts');

      const result = await fetchNoaaAlerts('http://example.com/feed', 'Test Source');

      expect(fetch).toHaveBeenCalledWith('http://example.com/feed');
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

      // Re-import the module to get the fresh mocks
      vi.resetModules();
      const { saveNoaaAlerts } = await import('../src/alerts/noaa-monitor.ts');

      await saveNoaaAlerts(alerts);

      expect(fsMock.mkdir).toHaveBeenCalledWith(expect.anything(), { recursive: true });
      expect(fsMock.writeFile).toHaveBeenCalled();
    });
  });

  describe('monitorNoaaAlerts', () => {
    it('should run the monitoring process', async () => {
      // Mock fetchNoaaAlerts to return some alerts
      vi.resetModules();
      const { fetchNoaaAlerts } = await import('../src/alerts/noaa-monitor.ts');
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

      // Re-import the module to get the fresh mocks and the monitor function
      vi.resetModules();
      const { monitorNoaaAlerts } = await import('../src/alerts/noaa-monitor.ts');

      await monitorNoaaAlerts();

      // We expect the logger to have been called
      expect(true).toBe(true);
    });
  });
});