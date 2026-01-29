import { describe, it, expect, beforeEach } from 'vitest';
import { RegistryClient } from '../src/registry-client.js';
import { searchPackages } from '../src/tools/search-packages.js';

describe('Search Packages Tool', () => {
  let client: RegistryClient;

  beforeEach(() => {
    client = new RegistryClient();
  });

  it('should validate input parameters', async () => {
    await expect(
      searchPackages({ query: '', limit: 10 }, client)
    ).rejects.toThrow();

    await expect(
      searchPackages({ query: 'react', limit: -1 }, client)
    ).rejects.toThrow();

    await expect(
      searchPackages({ query: 'react', limit: 100 }, client)
    ).rejects.toThrow();
  });

  it('should search for react packages', async () => {
    const result = await searchPackages({ query: 'react', limit: 5 }, client);
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.packages).toBeDefined();
    expect(Array.isArray(parsed.packages)).toBe(true);
    expect(parsed.packages.length).toBeGreaterThan(0);
    expect(parsed.packages.length).toBeLessThanOrEqual(5);

    // Check package structure
    const firstPackage = parsed.packages[0];
    expect(firstPackage.name).toBeDefined();
    expect(firstPackage.version).toBeDefined();
    expect(firstPackage.score).toBeDefined();
    expect(firstPackage.score.final).toBeGreaterThanOrEqual(0);
    // Score is percentage (0-100)
    expect(typeof firstPackage.score.final).toBe('number');
  });

  it('should handle no results gracefully', async () => {
    const result = await searchPackages(
      { query: 'xyzabc123nonexistentpackage999', limit: 10 },
      client
    );
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.packages).toEqual([]);
    expect(parsed.total).toBe(0);
  });

  it('should sort packages by score', async () => {
    const result = await searchPackages({ query: 'lodash', limit: 10 }, client);
    const parsed = JSON.parse(result);

    if (parsed.packages.length > 1) {
      for (let i = 0; i < parsed.packages.length - 1; i++) {
        expect(parsed.packages[i].score.final).toBeGreaterThanOrEqual(
          parsed.packages[i + 1].score.final
        );
      }
    }
  });
});
