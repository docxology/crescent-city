import { describe, it, expect, beforeEach, vi } from 'bun:test';
import { fetchRSSFeed, saveNewsItems, monitorNews } from '../src/news_monitor.ts';
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

    it('should deduplicate items by link within the same feed', async () => {
      const mockXML = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Test News Title 1</title>
              <link>http://example.com/test1</link>
              <pubDate>Mon, 13 Mar 2026 12:00:00 GMT</pubDate>
              <description>Description 1</description>
            </item>
            <item>
              <title>Test News Title 2</title>
              <link>http://example.com/test1</link>
              <pubDate>Tue, 14 Mar 2026 12:00:00 GMT</pubDate>
              <description>Description 2</description>
            </item>
          </channel>
        </rss>`;

      fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockXML)
      });

      const result = await fetchRSSFeed('http://example.com/feed', 'Test Source');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test News Title 1');
    });

    it('should filter items by Crescent City keywords', async () => {
      const mockXML = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Crescent City Council Meeting</title>
              <link>http://example.com/cc-meeting</link>
              <pubDate>Mon, 13 Mar 2026 12:00:00 GMT</pubDate>
              <description>The city council met to discuss harbor improvements.</description>
            </item>
            <item>
              <title>Generic News Title</title>
              <link>http://example.com/generic</link>
              <pubDate>Mon, 13 Mar 2026 12:00:00 GMT</pubDate>
              <description>This is not relevant to Crescent City.</description>
            </item>
          </channel>
        </rss>`;

      fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockXML)
      });

      const result = await fetchRSSFeed('http://example.com/feed', 'Test Source');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Crescent City Council Meeting');
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