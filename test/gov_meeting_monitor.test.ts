import { describe, it, expect, beforeEach, vi } from 'bun:test';
import { fetchGovMeetings, saveMeetingItems, monitorGovMeetings } from '../src/gov_meeting_monitor.ts';
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

describe('Government Meeting Monitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchGovMeetings', () => {
    it('should fetch and parse government meeting page correctly', async () => {
      const mockHTML = `
        <html>
          <body>
            <div class="meetings">
              <a href="/agendas/city-council-mar-2026.pdf">City Council Meeting - March 2026</a>
              <a href="/agendas/planning-commission-feb-2026.pdf">Planning Commission Meeting - February 2026</a>
              <a href="/contact.html">Contact Us</a>
            </div>
          </body>
        </html>`;

      fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHTML)
      });

      const result = await fetchGovMeetings('https://crescentcity.org/government/city-council/agendas', 'City Council');

      expect(fetch).toHaveBeenCalledWith('https://crescentcity.org/government/city-council/agendas');
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        title: 'City Council Meeting - March 2026',
        link: 'https://crescentcity.org/agendas/city-council-mar-2026.pdf',
        content: expect.stringContaining('City Council Meeting - March 2026')
      });
      expect(result[1]).toMatchObject({
        title: 'Planning Commission Meeting - February 2026',
        link: 'https://crescentcity.org/agendas/planning-commission-feb-2026.pdf',
        content: expect.stringContaining('Planning Commission Meeting - February 2026')
      });
    });

    it('should handle HTTP errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await fetchGovMeetings('https://crescentcity.org/government/city-council/agendas', 'City Council');

      expect(fetch).toHaveBeenCalledWith('https://crescentcity.org/government/city-council/agendas');
      expect(result).toHaveLength(0);
    });

    it('should deduplicate items by link', async () => {
      const mockHTML = `
        <html>
          <body>
            <div class="meetings">
              <a href="/agendas/meeting.pdf">Meeting Agenda</a>
              <a href="/agendas/meeting.pdf">Meeting Agenda (Duplicate)</a>
              <a href="/agendas/other.pdf">Other Meeting</a>
            </div>
          </body>
        </html>`;

      fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHTML)
      });

      const result = await fetchGovMeetings('https://crescentcity.org/government/city-council/agendas', 'City Council');

      expect(result).toHaveLength(2);
      const links = result.map(item => item.link);
      expect(links).toContain('https://crescentcity.org/agendas/meeting.pdf');
      expect(links).toContain('https://crescentcity.org/agendas/other.pdf');
    });

    it('should filter items by meeting keywords', async () => {
      const mockHTML = `
        <html>
          <body>
            <div class="meetings">
              <a href="/agendas/city-council-mar-2026.pdf">City Council Meeting - March 2026</a>
              <a href="/news/local-event.pdf">Local Event Newsletter</a>
              <a href="/agendas/planning-commission-feb-2026.pdf">Planning Commission Minutes - February 2026</a>
            </div>
          </body>
        </html>`;

      fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHTML)
      });

      const result = await fetchGovMeetings('https://crescentcity.org/government/city-council/agendas', 'City Council');

      expect(result).toHaveLength(2);
      const titles = result.map(item => item.title);
      expect(titles).toContain('City Council Meeting - March 2026');
      expect(titles).toContain('Planning Commission Minutes - February 2026');
      // Should not contain the newsletter
      expect(titles).not.toContain('Local Event Newsletter');
    });
  });

  describe('saveMeetingItems', () => {
    it('should save meeting items to a JSON file', async () => {
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
          title: 'Test Meeting',
          link: 'http://example.com/meeting.pdf',
          date: 'Mar 13, 2026',
          content: 'Test content',
          source: 'Test Source',
          fetchedAt: '2026-03-13T12:00:00.000Z'
        }
      ];

      await saveMeetingItems(items);

      expect(fsMock.mkdir).toHaveBeenCalledWith(expect.anything(), { recursive: true });
      expect(fsMock.writeFile).toHaveBeenCalled();
    });
  });

  describe('monitorGovMeetings', () => {
    it('should run the monitoring process', async () => {
      // Mock fetchGovMeetings to return some items
      vi.spyOn(require('../src/gov_meeting_monitor.ts'), 'fetchGovMeetings').mockResolvedValue([
        {
          title: 'Test Meeting',
          link: 'http://example.com/meeting.pdf',
          date: 'Mar 13, 2026',
          content: 'Test content'
        }
      ]);

      await monitorGovMeetings();
      
      // Check that fetchGovMeetings was called for each government source
      expect(require('../src/gov_meeting_monitor.ts').fetchGovMeetings).toHaveBeenCalledTimes(3);
      expect(true).toBe(true);
    });
  });
});