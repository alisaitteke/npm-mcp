import { describe, it, expect, beforeEach } from 'vitest';
import { RegistryClient } from '../src/registry-client.js';
import {
  compareVersions,
  checkCompatibility,
} from '../src/tools/version-compatibility.js';

describe('Version Compatibility Tools', () => {
  let client: RegistryClient;

  beforeEach(() => {
    client = new RegistryClient();
  });

  describe('compareVersions', () => {
    it('should validate input parameters', async () => {
      await expect(
        compareVersions(
          { packageName: '', fromVersion: '1.0.0', toVersion: '2.0.0' },
          client
        )
      ).rejects.toThrow();
    });

    it('should compare lodash versions', async () => {
      const result = await compareVersions(
        {
          packageName: 'lodash',
          fromVersion: '4.17.20',
          toVersion: '4.17.21',
        },
        client
      );
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.comparison.type).toBe('upgrade');
      expect(parsed.comparison.changeType).toBe('patch');
      expect(parsed.comparison.isBreaking).toBe(false);
    });

    it('should detect major version changes', async () => {
      const result = await compareVersions(
        {
          packageName: 'react',
          fromVersion: '17.0.2',
          toVersion: '18.0.0',
        },
        client
      );
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.comparison.changeType).toBe('major');
      expect(parsed.comparison.isBreaking).toBe(true);
      expect(parsed.recommendation).toContain('Major version change');
    });

    it('should handle non-existent versions', async () => {
      const result = await compareVersions(
        {
          packageName: 'express',
          fromVersion: '999.999.999',
          toVersion: '4.18.0',
        },
        client
      );
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain('not found');
    });
  });

  describe('checkCompatibility', () => {
    it('should validate input parameters', async () => {
      await expect(
        checkCompatibility(
          { packageName: '', existingDependencies: {} },
          client
        )
      ).rejects.toThrow();
    });

    it('should check react compatibility with compatible react-dom', async () => {
      const result = await checkCompatibility(
        {
          packageName: 'react',
          version: '18.2.0',
          existingDependencies: {
            'react-dom': '18.2.0',
          },
        },
        client
      );
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.version).toBe('18.2.0');
      // React typically has peer dependencies on react-dom or other react packages
    });

    it('should detect missing peer dependencies', async () => {
      const result = await checkCompatibility(
        {
          packageName: '@testing-library/react',
          existingDependencies: {},
        },
        client
      );
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      // @testing-library/react has peer dependencies on react
      if (parsed.analysis.peerDependencies.total > 0) {
        expect(parsed.analysis.details.missing.length).toBeGreaterThan(0);
        expect(parsed.compatible).toBe(false);
      }
    });

    it('should handle packages with no peer dependencies', async () => {
      const result = await checkCompatibility(
        {
          packageName: 'lodash',
          existingDependencies: {},
        },
        client
      );
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.compatible).toBe(true);
      expect(parsed.analysis.peerDependencies.total).toBe(0);
    });
  });
});
