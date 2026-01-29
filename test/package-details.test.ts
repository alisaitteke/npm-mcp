import { describe, it, expect, beforeEach } from 'vitest';
import { RegistryClient } from '../src/registry-client.js';
import { getPackageDetails } from '../src/tools/package-details.js';

describe('Package Details Tool', () => {
  let client: RegistryClient;

  beforeEach(() => {
    client = new RegistryClient();
  });

  it('should validate input parameters', async () => {
    await expect(
      getPackageDetails({ packageName: '' }, client)
    ).rejects.toThrow();
  });

  it('should get details for express package', async () => {
    const result = await getPackageDetails(
      { packageName: 'express' },
      client
    );
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.package.name).toBe('express');
    expect(parsed.package.version).toBeDefined();
    expect(parsed.package.description).toBeDefined();

    expect(parsed.metadata).toBeDefined();
    expect(parsed.metadata.license).toBeDefined();

    expect(parsed.versions).toBeDefined();
    expect(parsed.versions.latest).toBeDefined();
    expect(parsed.versions.total).toBeGreaterThan(0);

    expect(parsed.dependencies).toBeDefined();
    expect(parsed.dist).toBeDefined();
    expect(parsed.dist.tarball).toContain('express');
  });

  it('should get specific version details', async () => {
    const result = await getPackageDetails(
      { packageName: 'lodash', version: '4.17.21' },
      client
    );
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.package.name).toBe('lodash');
    expect(parsed.package.version).toBe('4.17.21');
  });

  it('should handle non-existent package', async () => {
    const result = await getPackageDetails(
      { packageName: 'this-package-definitely-does-not-exist-xyz123' },
      client
    );
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(false);
    expect(parsed.error).toBeDefined();
  });

  it('should handle non-existent version', async () => {
    const result = await getPackageDetails(
      { packageName: 'express', version: '999.999.999' },
      client
    );
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('not found');
    expect(parsed.availableVersions).toBeDefined();
  });

  it('should include download statistics when available', async () => {
    const result = await getPackageDetails(
      { packageName: 'react' },
      client
    );
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.stats).toBeDefined();
    expect(parsed.stats.weeklyDownloads).toBeDefined();
  });

  it('should include recent versions', async () => {
    const result = await getPackageDetails(
      { packageName: 'typescript' },
      client
    );
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.versions.recent).toBeDefined();
    expect(Array.isArray(parsed.versions.recent)).toBe(true);
    expect(parsed.versions.recent.length).toBeGreaterThan(0);
    expect(parsed.versions.recent.length).toBeLessThanOrEqual(5);

    // Check version structure
    const recentVersion = parsed.versions.recent[0];
    expect(recentVersion.version).toBeDefined();
    expect(recentVersion.publishedAt).toBeDefined();
  });
});
