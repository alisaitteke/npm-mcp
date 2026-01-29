import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import nock from 'nock';
import { RegistryClient } from '../src/registry-client.js';
import type { Packument, SearchResponse } from '../src/types.js';

// Disable real HTTP requests
beforeAll(() => {
  nock.disableNetConnect();
});

afterAll(() => {
  nock.enableNetConnect();
});

describe('RegistryClient', () => {
  let client: RegistryClient;
  const registryUrl = 'https://registry.npmjs.org';

  beforeEach(() => {
    client = new RegistryClient({ registryUrl });
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('getPackage', () => {
    it('should fetch package metadata successfully', async () => {
      const mockPackument: Partial<Packument> = {
        name: 'lodash',
        description: 'Lodash modular utilities',
        'dist-tags': { latest: '4.17.21' },
        versions: {},
        time: { created: '2012-04-23T21:26:23.000Z', modified: '2023-01-01T00:00:00.000Z' },
      };

      nock(registryUrl)
        .get('/lodash')
        .reply(200, mockPackument);

      const result = await client.getPackage('lodash');
      expect(result.name).toBe('lodash');
      expect(result['dist-tags'].latest).toBe('4.17.21');
    });

    it('should handle package not found (404)', async () => {
      nock(registryUrl)
        .get('/nonexistent-package')
        .reply(404, { error: 'Not found' });

      await expect(client.getPackage('nonexistent-package')).rejects.toThrow(
        'Package not found'
      );
    });

    it('should cache responses', async () => {
      const mockPackument: Partial<Packument> = {
        name: 'react',
        'dist-tags': { latest: '18.2.0' },
        versions: {},
        time: { created: '2013-05-29T00:00:00.000Z', modified: '2023-01-01T00:00:00.000Z' },
      };

      nock(registryUrl)
        .get('/react')
        .reply(200, mockPackument);

      // First call - should hit API
      await client.getPackage('react');

      // Second call - should use cache (nock won't be called again)
      const result = await client.getPackage('react');
      expect(result.name).toBe('react');

      const stats = client.getCacheStats();
      expect(stats.size).toBe(1);
    });
  });

  describe('getPackageVersion', () => {
    it('should fetch specific package version', async () => {
      const mockVersion = {
        name: 'express',
        version: '4.18.0',
        description: 'Fast, unopinionated, minimalist web framework',
        dist: {
          tarball: 'https://registry.npmjs.org/express/-/express-4.18.0.tgz',
          shasum: 'abc123',
        },
      };

      nock(registryUrl)
        .get('/express/4.18.0')
        .reply(200, mockVersion);

      const result = await client.getPackageVersion('express', '4.18.0');
      expect(result.version).toBe('4.18.0');
    });
  });

  describe('searchPackages', () => {
    it('should search packages successfully', async () => {
      const mockSearchResponse: SearchResponse = {
        objects: [
          {
            package: {
              name: 'react',
              version: '18.2.0',
              description: 'React is a JavaScript library for building user interfaces.',
              date: '2023-01-01T00:00:00.000Z',
              links: { npm: 'https://www.npmjs.com/package/react' },
              publisher: { name: 'facebook', username: 'facebook' },
              maintainers: [],
            },
            score: {
              final: 0.95,
              detail: { quality: 0.96, popularity: 0.98, maintenance: 0.99 },
            },
            searchScore: 100000,
          },
        ],
        total: 1,
        time: '2023-01-01T00:00:00.000Z',
      };

      nock(registryUrl)
        .get('/-/v1/search')
        .query({ text: 'react', size: '20', from: '0' })
        .reply(200, mockSearchResponse);

      const result = await client.searchPackages('react');
      expect(result.objects).toHaveLength(1);
      expect(result.objects[0].package.name).toBe('react');
    });

    it('should handle search with custom limit', async () => {
      nock(registryUrl)
        .get('/-/v1/search')
        .query({ text: 'test', size: '5', from: '0' })
        .reply(200, { objects: [], total: 0, time: '2023-01-01T00:00:00.000Z' });

      const result = await client.searchPackages('test', { limit: 5 });
      expect(result.objects).toHaveLength(0);
    });
  });

  describe('rate limiting', () => {
    it('should retry on 429 rate limit', async () => {
      const mockPackument: Partial<Packument> = {
        name: 'test-package',
        'dist-tags': { latest: '1.0.0' },
        versions: {},
        time: { created: '2023-01-01T00:00:00.000Z', modified: '2023-01-01T00:00:00.000Z' },
      };

      // First call returns 429, second succeeds
      nock(registryUrl)
        .get('/test-package')
        .reply(429, { error: 'Too Many Requests' })
        .get('/test-package')
        .reply(200, mockPackument);

      const result = await client.getPackage('test-package');
      expect(result.name).toBe('test-package');
    });
  });

  describe('error handling', () => {
    it('should handle server errors (500)', async () => {
      nock(registryUrl)
        .get('/error-package')
        .reply(500, { error: 'Internal Server Error', reason: 'Database error' });

      await expect(client.getPackage('error-package')).rejects.toThrow(
        'Internal Server Error'
      );
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      const mockPackument: Partial<Packument> = {
        name: 'test',
        'dist-tags': { latest: '1.0.0' },
        versions: {},
        time: { created: '2023-01-01T00:00:00.000Z', modified: '2023-01-01T00:00:00.000Z' },
      };

      nock(registryUrl)
        .get('/test')
        .reply(200, mockPackument);

      await client.getPackage('test');
      expect(client.getCacheStats().size).toBe(1);

      client.clearCache();
      expect(client.getCacheStats().size).toBe(0);
    });
  });

  describe('getDownloadStats', () => {
    it('should fetch download statistics', async () => {
      const mockStats = {
        downloads: 1000000,
        start: '2023-01-01',
        end: '2023-01-07',
        package: 'lodash',
      };

      nock('https://api.npmjs.org')
        .get('/downloads/point/last-week/lodash')
        .reply(200, mockStats);

      const result = await client.getDownloadStats('lodash', 'last-week');
      expect(result.downloads).toBe(1000000);
      expect(result.package).toBe('lodash');
    });
  });
});
