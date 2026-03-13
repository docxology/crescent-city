import { describe, it, expect, beforeEach, vi } from 'bun:test';
import { runMonitor } from '../src/monitor.ts';
import { createLogger } from '../src/logger.ts';

// Mock the logger
vi.mock('../src/logger.ts', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}));

// Mock fs/promises with simpler approach
const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockExistsSync = vi.fn();
vi.mock('fs/promises', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile
}));
vi.mock('fs', () => ({
  existsSync: mockExistsSync
}));

// Mock shared modules
vi.mock('../src/shared/paths.js', () => ({
  paths: {
    toc: '/fake/path/toc.json',
    manifest: '/fake/path/manifest.json',
    article: (guid: string) => `/fake/path/articles/${guid}.json`,
    output: '/fake/path/output'
  }
}));

vi.mock('../src/shared/data.js', () => ({
  loadToc: vi.fn(),
  loadManifest: vi.fn(),
  loadAllArticles: vi.fn()
}));

vi.mock('../src/utils.js', () => ({
  computeSha256: vi.fn().mockResolvedValue('fake-hash-value')
}));

describe('Monitor Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('runMonitor', () => {
    it('should return error when no scraped data found', async () => {
      mockExistsSync.mockImplementation((path) => {
        return path === '/fake/path/toc.json' || path === '/fake/path/manifest.json';
      });

      const result = await runMonitor();

      expect(result.overallStatus).toBe('error');
      expect(result.summary).toBe('No scraped data found');
    });

    it('should return clean status when all checks pass', async () => {
      mockExistsSync.mockReturnValue(true);
      
      // Mock loadManifest to return some articles
      const mockManifest = {
        articles: {
          'article1': { guid: 'article1' },
          'article2': { guid: 'article2' }
        }
      };
      
      // Mock loadAllArticles to return articles with matching hashes
      const mockArticles = [
        {
          sections: [
            { guid: 'section1' },
            { guid: 'section2' }
          ],
          rawHtml: '<html>test</html>',
          sha256: 'fake-hash-value'
        },
        {
          sections: [
            { guid: 'section3' },
            { guid: 'section4' }
          ],
          rawHtml: '<html>test2</html>',
          sha256: 'fake-hash-value'
        }
      ];
      
      // Mock loadToc to return a TOC with sections
      const mockToc = {
        children: [
          {
            type: 'section',
            guid: 'section1'
          },
          {
            type: 'section',
            guid: 'section2'
          },
          {
            type: 'section',
            guid: 'section3'
          },
          {
            type: 'section',
            guid: 'section4'
          }
        ]
      };
      
      // Set up the mocks
      require('../src/shared/data.js').loadManifest.mockResolvedValue(mockManifest);
      require('../src/shared/data.js').loadAllArticles.mockResolvedValue(mockArticles);
      require('../src/shared/data.js').loadToc.mockResolvedValue(mockToc);
      
      const result = await runMonitor();

      expect(result.overallStatus).toBe('clean');
      expect(result.articlesChecked).toBe(2);
      expect(result.hashMismatches).toHaveLength(0);
      expect(result.missingSections).toHaveLength(0);
      expect(result.newSections).toHaveLength(0);
    });

    it('should detect hash mismatches', async () => {
      mockExistsSync.mockReturnValue(true);
      
      // Mock loadManifest
      const mockManifest = {
        articles: {
          'article1': { guid: 'article1' }
        }
      };
      
      // Mock loadAllArticles to return article with different hash
      const mockArticles = [
        {
          sections: [
            { guid: 'section1' }
          ],
          rawHtml: '<html>test</html>',
          sha256: 'different-hash-value' // This will cause a mismatch
        }
      ];
      
      // Mock loadToc
      const mockToc = {
        children: [
          {
            type: 'section',
            guid: 'section1'
          }
        ]
      };
      
      // Set up the mocks
      require('../src/shared/data.js').loadManifest.mockResolvedValue(mockManifest);
      require('../src/shared/data.js').loadAllArticles.mockResolvedValue(mockArticles);
      require('../src/shared/data.js').loadToc.mockResolvedValue(mockToc);
      
      const result = await runMonitor();

      expect(result.overallStatus).toBe('changed');
      expect(result.hashMismatches).toContain('article1: hash mismatch');
    });
  });
});