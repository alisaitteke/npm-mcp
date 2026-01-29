import { describe, it, expect, beforeEach } from 'vitest';
import { RegistryClient } from '../src/registry-client.js';
import { analyzeQuality } from '../src/tools/quality-analysis.js';

describe('Quality Analysis Tool', () => {
  let client: RegistryClient;

  beforeEach(() => {
    client = new RegistryClient();
  });

  it('should validate input parameters', async () => {
    await expect(analyzeQuality({ packageName: '' }, client)).rejects.toThrow();
  });

  it('should analyze react package quality', async () => {
    const result = await analyzeQuality({ packageName: 'react' }, client);
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.package).toBe('react');
    expect(parsed.scores).toBeDefined();
    expect(parsed.scores.overall).toBeGreaterThanOrEqual(0);
    expect(parsed.scores.overall).toBeLessThanOrEqual(100);
    expect(parsed.scores.popularity).toBeDefined();
    expect(parsed.scores.maintenance).toBeDefined();
    expect(parsed.scores.community).toBeDefined();
  });

  it('should provide download metrics', async () => {
    const result = await analyzeQuality({ packageName: 'lodash' }, client);
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.metrics.downloads).toBeDefined();
    expect(parsed.metrics.downloads.weekly).toBeDefined();
    expect(parsed.metrics.downloads.monthly).toBeDefined();
  });

  it('should provide version metrics', async () => {
    const result = await analyzeQuality({ packageName: 'express' }, client);
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.metrics.versions).toBeDefined();
    expect(parsed.metrics.versions.total).toBeGreaterThan(0);
    expect(parsed.metrics.versions.latest).toBeDefined();
    expect(parsed.metrics.versions.daysSinceLastPublish).toBeGreaterThanOrEqual(0);
  });

  it('should provide quality assessment', async () => {
    const result = await analyzeQuality({ packageName: 'typescript' }, client);
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.assessment).toBeDefined();
    expect(Array.isArray(parsed.assessment)).toBe(true);
    expect(parsed.assessment.length).toBeGreaterThan(0);
  });

  it('should handle GitHub repository metrics when available', async () => {
    const result = await analyzeQuality({ packageName: 'react' }, client);
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    // GitHub metrics might be available for popular packages
    if (parsed.metrics.github) {
      expect(parsed.metrics.github.stars).toBeDefined();
      expect(parsed.metrics.github.forks).toBeDefined();
    }
  });

  it('should handle non-existent package', async () => {
    const result = await analyzeQuality(
      { packageName: 'this-package-definitely-does-not-exist-xyz123' },
      client
    );
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(false);
    expect(parsed.error).toBeDefined();
  });
});
