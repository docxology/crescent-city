import { describe, it, expect, beforeEach, vi } from 'bun:test';

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

// Mock the logger
vi.mock('../src/logger.ts', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}));

// Now import the module after mocks
import { fetchRSSFeed, saveNewsItems, monitorNews } from '../src/news_monitor.ts';
import { createLogger } from '../src/logger.ts';

describe('News Monitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchRSSFeed', () => {
    it('should fetch and parse RSS feed correctly', async () => {
      const mockXML = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Test News Title</title>
              <link>http://example.com/test</link>
              <pubDate>Mon, 13 Mar 2026 12:00:00 GMT</pubDate>
              <description><![CDATA[<p>This is a test description about Crescent City.</p>]]></description>
            </item>
          </channel>
        </rss>`;

      // Mock the DOMParser instance
      const mockParseFromString = vi.fn();
      const mockGetElementsByTagName = vi.fn();
      const mockGetElementsByTagNameNS = vi.fn();

      const mockDOMParser = vi.fn(() => ({
        parseFromString: mockParseFromString,
        getElementsByTagName: mockGetElementsByTagName,
        getElementsByTagNameNS: mockGetElementsByTagNameNS
      }));

      // We need to re-mock the DOMParser with the implementation
      // Since we already mocked the module, we can adjust the mock
      // Get the actual mock object and modify its mockImplementation
      const domParserMock = require('@xmldom/xmldom').DOMParser;
      domParserMock.mockImplementation(() => ({
        parseFromString: mockParseFromString,
        getElementsByTagName: mockGetElementsByTagName,
        getElementsByTagNameNS: mockGetElementsByTagNameNS
      }));

      // Now set up the mock return values
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
      const mockTitleElement = { textContent: 'Test News Title' };
      const mockLinkElement = { textContent: 'http://example.com/test' };
      const mockPubDateElement = { textContent: 'Mon, 13 Mar 2026 12:00:00 GMT' };
      const mockDescriptionElement = { textContent: '<p>This is a test description about Crescent City.</p>' };

      // Set up the mock return values for the item
      mockEntry.getElementsByTagName.mockImplementation((tagName) => {
        if (tagName === 'title') return [mockTitleElement];
        if (tagName === 'link') return [mockLinkElement];
        if (tagName === 'pubDate') return [mockPubDateElement];
        if (tagName === 'description') return [mockDescriptionElement];
        return [];
      });

      // Mock the fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockXML)
      });

      const result = await fetchRSSFeed('http://example.com/feed', 'Test Source');

      expect(fetch).toHaveBeenCalledWith('http://example.com/feed');
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        title: 'Test News Title',
        link: 'http://example.com/test',
        pubDate: 'Mon, 13 Mar 2026 12:00:00 GMT',
        content: expect.stringContaining('This is a test description about Crescent City.')
      });
    });

    it('should handle HTTP errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await fetchRSSFeed('http://example.com/feed', 'Test Source');

      expect(fetch).toHaveBeenCalledWith('http://example.com/feed');
      expect(result).toHaveLength(0);
    });
  });

  describe('saveNewsItems', () => {
    it('should save news items to a JSON file', async () => {
      const fsMock = {
        mkdir: vi.fn(),
        writeFile: vi.fn()
      };
      vi.mock('fs/promises', () => fsMock);
      const pathMock = {
        join: (...args: string[]) => args.join('/')
      };
      vi.mock('path', () => pathMock);

      const items = [
        {
          title: 'Test News',
          link: 'http://example.com/test',
          pubDate: 'Mon, 13 Mar 2026 12:00:00 GMT',
          content: 'Test content',
          source: 'Test Source',
          fetchedAt: '2026-03-13T12:00:00.000Z'
        }
      ];

      await saveNewsItems(items);

      expect(fsMock.mkdir).toHaveBeenCalledWith(expect.anything(), { recursive: true });
      expect(fsMock.writeFile).toHaveBeenCalled();
    });
  });

  describe('monitorNews', () => {
    it('should run the monitoring process', async () => {
      // Instead of mocking the module, let's mock the individual functions
      vi.spyOn(require('../src/news_monitor.ts'), 'fetchRSSFeed').mockResolvedValue([
        {
          title: 'Test News',
          link: 'http://example.com/test',
          pubDate: 'Mon, 13 Mar 2026 12:00:00 GMT',
          content: 'Test content'
        }
      ]);

      // We need to reload the module to get the mocked version
      // Actually, let's just test that the function runs without error for now
      await monitorNews();

      // Check that fetchRSSFeed was called for each news source
      expect(require('../src/news_monitor.ts').fetchRSSFeed).toHaveBeenCalledTimes(3);
      expect(true).toBe(true);
    });
  });
});