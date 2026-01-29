import { describe, it, expect, beforeEach } from 'vitest';
import { RegistryClient } from '../src/registry-client.js';
import { analyzeNpxCommand } from '../src/tools/npx-command.js';

describe('NPX Command Analysis Tool', () => {
  let client: RegistryClient;

  beforeEach(() => {
    client = new RegistryClient();
  });

  it('should validate input parameters', async () => {
    await expect(
      analyzeNpxCommand({ command: '' }, client)
    ).rejects.toThrow();
  });

  it('should analyze create-react-app command', async () => {
    const result = await analyzeNpxCommand(
      { command: 'create-react-app' },
      client
    );
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.analysis.package).toBe('create-react-app');
    expect(parsed.validation.packageExists).toBe(true);
    expect(parsed.validation.versionExists).toBe(true);
  });

  it('should analyze command with version', async () => {
    const result = await analyzeNpxCommand(
      { command: 'lodash@4.17.21' },
      client
    );
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.analysis.package).toBe('lodash');
    expect(parsed.analysis.version).toBe('4.17.21');
  });

  it('should analyze command with arguments', async () => {
    const result = await analyzeNpxCommand(
      {
        command: 'cowsay',
        args: ['Hello', 'World'],
      },
      client
    );
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.analysis.command).toContain('Hello');
    expect(parsed.analysis.command).toContain('World');
  });

  it('should provide package metadata', async () => {
    const result = await analyzeNpxCommand({ command: 'eslint' }, client);
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.metadata).toBeDefined();
    expect(parsed.metadata.description).toBeDefined();
    expect(parsed.metadata.license).toBeDefined();
  });

  it('should provide validation metrics', async () => {
    const result = await analyzeNpxCommand({ command: 'prettier' }, client);
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.validation).toBeDefined();
    expect(parsed.validation.sizeKB).toBeGreaterThanOrEqual(0);
    expect(parsed.validation.dependencyCount).toBeGreaterThanOrEqual(0);
    expect(parsed.validation.publishedDaysAgo).toBeGreaterThanOrEqual(0);
  });

  it('should provide warnings and recommendations', async () => {
    const result = await analyzeNpxCommand({ command: 'webpack' }, client);
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.warnings).toBeDefined();
    expect(Array.isArray(parsed.warnings)).toBe(true);
    expect(parsed.recommendations).toBeDefined();
    expect(Array.isArray(parsed.recommendations)).toBe(true);
    expect(parsed.recommendations.length).toBeGreaterThan(0);
  });

  it('should provide safe command suggestion', async () => {
    const result = await analyzeNpxCommand(
      { command: 'create-vite' },
      client
    );
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.safeCommand).toBeDefined();
    expect(parsed.safeCommand).toContain('create-vite');
  });

  it('should handle non-existent package', async () => {
    const result = await analyzeNpxCommand(
      { command: 'this-package-definitely-does-not-exist-xyz123' },
      client
    );
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('not found');
  });

  it('should handle invalid version', async () => {
    const result = await analyzeNpxCommand(
      { command: 'react@999.999.999' },
      client
    );
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('not found');
  });
});
