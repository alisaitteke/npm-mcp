import { describe, it, expect, beforeEach } from 'vitest';
import nock from 'nock';
import { RegistryClient } from '../src/registry-client.js';
import { analyzeCapabilities } from '../src/tools/package-capabilities.js';

describe('Package Capabilities Analysis', () => {
  let client: RegistryClient;

  beforeEach(() => {
    client = new RegistryClient();
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it('should analyze ESM package capabilities', async () => {
    const mockPackument = {
      name: 'vite',
      'dist-tags': { latest: '5.0.0' },
      versions: {
        '5.0.0': {
          name: 'vite',
          version: '5.0.0',
          type: 'module',
          main: './dist/node/index.js',
          module: './dist/node/index.mjs',
          types: './dist/node/index.d.ts',
          exports: {
            '.': {
              import: './dist/node/index.js',
              require: './dist/node/index.cjs',
              types: './dist/node/index.d.ts',
            },
          },
          engines: {
            node: '>=18.0.0',
          },
          devDependencies: {
            typescript: '^5.0.0',
            esbuild: '^0.19.0',
          },
          dist: {
            tarball: 'https://registry.npmjs.org/vite/-/vite-5.0.0.tgz',
            shasum: 'abc123',
          },
        },
      },
    };

    nock('https://registry.npmjs.org')
      .get('/vite')
      .reply(200, mockPackument);

    const result = await analyzeCapabilities(
      { packageName: 'vite' },
      client
    );

    const parsed = JSON.parse(result);
    
    expect(parsed.success).toBe(true);
    expect(parsed.moduleSystem.esm).toBe(true);
    expect(parsed.moduleSystem.dualPackage).toBe(true);
    expect(parsed.typescript.hasTypes).toBe(true);
    expect(parsed.platform.node).toBe(true);
    expect(parsed.exports.hasExports).toBe(true);
  });

  it('should detect CommonJS-only package', async () => {
    const mockPackument = {
      name: 'express',
      'dist-tags': { latest: '4.18.2' },
      versions: {
        '4.18.2': {
          name: 'express',
          version: '4.18.2',
          main: 'index.js',
          engines: {
            node: '>=0.10.0',
          },
          dist: {
            tarball: 'https://registry.npmjs.org/express/-/express-4.18.2.tgz',
            shasum: 'def456',
          },
        },
      },
    };

    nock('https://registry.npmjs.org')
      .get('/express')
      .reply(200, mockPackument);

    const result = await analyzeCapabilities(
      { packageName: 'express' },
      client
    );

    const parsed = JSON.parse(result);
    
    expect(parsed.success).toBe(true);
    expect(parsed.moduleSystem.commonjs).toBe(true);
    expect(parsed.moduleSystem.esm).toBe(false);
  });

  it('should detect TypeScript support', async () => {
    const mockPackument = {
      name: 'zod',
      'dist-tags': { latest: '3.22.0' },
      versions: {
        '3.22.0': {
          name: 'zod',
          version: '3.22.0',
          types: './lib/index.d.ts',
          main: './lib/index.js',
          module: './lib/index.mjs',
          devDependencies: {
            typescript: '^5.0.0',
          },
          dist: {
            tarball: 'https://registry.npmjs.org/zod/-/zod-3.22.0.tgz',
            shasum: 'ghi789',
          },
        },
      },
    };

    nock('https://registry.npmjs.org')
      .get('/zod')
      .reply(200, mockPackument);

    const result = await analyzeCapabilities(
      { packageName: 'zod' },
      client
    );

    const parsed = JSON.parse(result);
    
    expect(parsed.success).toBe(true);
    expect(parsed.typescript.hasTypes).toBe(true);
    expect(parsed.typescript.typesLocation).toBe('./lib/index.d.ts');
    expect(parsed.typescript.isTypeScriptPackage).toBe(true);
  });

  it('should detect browser support', async () => {
    const mockPackument = {
      name: 'axios',
      'dist-tags': { latest: '1.6.0' },
      versions: {
        '1.6.0': {
          name: 'axios',
          version: '1.6.0',
          main: 'index.js',
          browser: './dist/browser/axios.js',
          exports: {
            '.': {
              browser: './dist/browser/axios.js',
              node: './dist/node/axios.js',
            },
          },
          dist: {
            tarball: 'https://registry.npmjs.org/axios/-/axios-1.6.0.tgz',
            shasum: 'jkl012',
          },
        },
      },
    };

    nock('https://registry.npmjs.org')
      .get('/axios')
      .reply(200, mockPackument);

    const result = await analyzeCapabilities(
      { packageName: 'axios' },
      client
    );

    const parsed = JSON.parse(result);
    
    expect(parsed.success).toBe(true);
    expect(parsed.platform.browser).toBe(true);
    expect(parsed.platform.node).toBe(true);
  });

  it('should handle package not found', async () => {
    nock('https://registry.npmjs.org')
      .get('/nonexistent-package-xyz')
      .reply(404, { error: 'Not found' });

    const result = await analyzeCapabilities(
      { packageName: 'nonexistent-package-xyz' },
      client
    );

    const parsed = JSON.parse(result);
    
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('Package not found');
  });
});
