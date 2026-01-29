import { describe, it, expect, beforeEach } from 'vitest';
import { RegistryClient } from '../src/registry-client.js';
import { auditSecurity } from '../src/tools/security-audit.js';

describe('Security Audit Tool', () => {
  let client: RegistryClient;

  beforeEach(() => {
    client = new RegistryClient();
  });

  it('should validate input parameters', async () => {
    await expect(auditSecurity({ packageName: '' }, client)).rejects.toThrow();
  });

  it('should audit lodash package', async () => {
    const result = await auditSecurity({ packageName: 'lodash' }, client);
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.package).toBe('lodash');
    expect(parsed.version).toBeDefined();
    expect(parsed.security).toBeDefined();
    expect(parsed.security.score).toBeGreaterThanOrEqual(0);
    expect(parsed.security.score).toBeLessThanOrEqual(100);
    expect(parsed.dependencies).toBeDefined();
    expect(parsed.recommendations).toBeDefined();
    expect(Array.isArray(parsed.recommendations)).toBe(true);
  });

  it('should audit specific version', async () => {
    const result = await auditSecurity(
      { packageName: 'express', version: '4.18.0' },
      client
    );
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.version).toBe('4.18.0');
  });

  it('should handle non-existent package', async () => {
    const result = await auditSecurity(
      { packageName: 'this-package-definitely-does-not-exist-xyz123' },
      client
    );
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(false);
    expect(parsed.error).toBeDefined();
  });

  it('should provide security score', async () => {
    const result = await auditSecurity({ packageName: 'react' }, client);
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.security.score).toBeDefined();
    expect(typeof parsed.security.score).toBe('number');
    expect(parsed.security.hasVulnerabilities).toBeDefined();
    expect(typeof parsed.security.hasVulnerabilities).toBe('boolean');
  });

  it('should categorize vulnerabilities by severity', async () => {
    const result = await auditSecurity({ packageName: 'typescript' }, client);
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.security.severity).toBeDefined();
    expect(parsed.security.severity).toHaveProperty('critical');
    expect(parsed.security.severity).toHaveProperty('high');
    expect(parsed.security.severity).toHaveProperty('moderate');
    expect(parsed.security.severity).toHaveProperty('low');
    expect(parsed.security.severity).toHaveProperty('info');
  });
});
