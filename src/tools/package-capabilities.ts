import { z } from 'zod';
import { RegistryClient } from '../registry-client.js';
import type { Packument } from '../types.js';

/**
 * Schema for package capabilities analysis
 */
export const AnalyzeCapabilitiesSchema = z.object({
  packageName: z.string().min(1, 'Package name must not be empty'),
  version: z.string().optional(),
});

export type AnalyzeCapabilitiesParams = z.infer<typeof AnalyzeCapabilitiesSchema>;

/**
 * Analyze package capabilities: ESM, CJS, TypeScript, Browser, etc.
 */
export async function analyzeCapabilities(
  params: AnalyzeCapabilitiesParams,
  client: RegistryClient
): Promise<string> {
  const validated = AnalyzeCapabilitiesSchema.parse(params);

  try {
    // Fetch package data
    const packument: Packument = await client.getPackage(validated.packageName);
    const targetVersion = validated.version || packument['dist-tags'].latest;
    const versionData = packument.versions[targetVersion];

    if (!versionData) {
      return JSON.stringify({
        success: false,
        error: `Version ${targetVersion} not found`,
      });
    }

    // Analyze capabilities
    const capabilities = {
      success: true,
      package: {
        name: validated.packageName,
        version: targetVersion,
      },
      moduleSystem: analyzeModuleSystem(versionData, packument),
      typescript: analyzeTypeScriptSupport(versionData),
      platform: analyzePlatformSupport(versionData),
      exports: analyzeExports(versionData),
      buildTools: analyzeBuildTools(versionData),
      engines: analyzeEngines(versionData),
      summary: '',
    };

    // Generate summary
    capabilities.summary = generateCapabilitiesSummary(capabilities);

    return JSON.stringify(capabilities, null, 2);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return JSON.stringify({
      success: false,
      error: errorMessage,
      packageName: validated.packageName,
      version: validated.version,
    });
  }
}

/**
 * Analyze module system support (ESM, CJS, UMD, etc.)
 */
function analyzeModuleSystem(versionData: any, packument: any) {
  const analysis = {
    esm: false,
    commonjs: false,
    umd: false,
    dualPackage: false,
    details: [] as string[],
  };

  // Check package.json type field
  const packageType = versionData.type || packument.type;
  if (packageType === 'module') {
    analysis.esm = true;
    analysis.details.push('Package type: "module" (native ESM)');
  }

  // Check for exports field (modern ESM/CJS support)
  if (versionData.exports) {
    analysis.esm = true;
    analysis.details.push('Has "exports" field (conditional exports)');

    // Check for dual package (both ESM and CJS)
    const exportsStr = JSON.stringify(versionData.exports);
    if (exportsStr.includes('import') && exportsStr.includes('require')) {
      analysis.dualPackage = true;
      analysis.commonjs = true;
      analysis.details.push('Dual package: ESM + CommonJS support');
    } else if (exportsStr.includes('import')) {
      analysis.details.push('ESM-only via exports.import');
    } else if (exportsStr.includes('require')) {
      analysis.commonjs = true;
      analysis.details.push('CommonJS via exports.require');
    }
  }

  // Check for module field (ESM entry point)
  if (versionData.module) {
    analysis.esm = true;
    analysis.details.push(`ESM entry: ${versionData.module}`);
  }

  // Check main field (usually CommonJS)
  if (versionData.main) {
    const mainFile = versionData.main;
    if (mainFile.endsWith('.mjs')) {
      analysis.esm = true;
      analysis.details.push(`Main file: ${mainFile} (ESM)`);
    } else if (mainFile.endsWith('.cjs')) {
      analysis.commonjs = true;
      analysis.details.push(`Main file: ${mainFile} (CommonJS)`);
    } else {
      analysis.commonjs = true;
      analysis.details.push(`Main file: ${mainFile} (likely CommonJS)`);
    }
  }

  // Check for UMD (browser field or umd in keywords)
  if (versionData.browser || versionData.keywords?.includes('umd')) {
    analysis.umd = true;
    analysis.details.push('UMD support detected');
  }

  // If no explicit ESM markers but has .mjs files in dist
  if (versionData.dist?.tarball && !analysis.esm) {
    analysis.details.push('Check tarball for .mjs files for ESM support');
  }

  return analysis;
}

/**
 * Analyze TypeScript support
 */
function analyzeTypeScriptSupport(versionData: any) {
  const analysis = {
    hasTypes: false,
    typesLocation: null as string | null,
    isTypeScriptPackage: false,
    details: [] as string[],
  };

  // Check for types field
  if (versionData.types || versionData.typings) {
    analysis.hasTypes = true;
    analysis.typesLocation = versionData.types || versionData.typings;
    analysis.details.push(`Type definitions: ${analysis.typesLocation}`);
  }

  // Check for @types package mention
  if (
    versionData.devDependencies?.['@types/' + versionData.name] ||
    versionData.dependencies?.['@types/' + versionData.name]
  ) {
    analysis.details.push('Uses @types/ package for types');
  }

  // Check if package itself is a @types package
  if (versionData.name.startsWith('@types/')) {
    analysis.hasTypes = true;
    analysis.isTypeScriptPackage = true;
    analysis.details.push('This is a TypeScript definition package');
  }

  // Check exports for types
  if (versionData.exports) {
    const exportsStr = JSON.stringify(versionData.exports);
    if (exportsStr.includes('types') || exportsStr.includes('.d.ts')) {
      analysis.hasTypes = true;
      analysis.details.push('Type definitions in exports field');
    }
  }

  // Check if written in TypeScript
  if (versionData.devDependencies?.typescript) {
    analysis.isTypeScriptPackage = true;
    analysis.details.push('Built with TypeScript');
  }

  // If no types found, check for @types/ recommendation
  if (!analysis.hasTypes && !analysis.isTypeScriptPackage) {
    analysis.details.push(
      `May need @types/${versionData.name} for TypeScript support`
    );
  }

  return analysis;
}

/**
 * Analyze platform support (Node.js, Browser, Deno, etc.)
 */
function analyzePlatformSupport(versionData: any) {
  const analysis = {
    node: false,
    browser: false,
    deno: false,
    bun: false,
    react: false,
    reactNative: false,
    details: [] as string[],
  };

  // Check for Node.js support
  if (versionData.engines?.node || versionData.main) {
    analysis.node = true;
    if (versionData.engines?.node) {
      analysis.details.push(`Node.js: ${versionData.engines.node}`);
    } else {
      analysis.details.push('Node.js: Supported (has main entry)');
    }
  }

  // Check for browser support
  if (versionData.browser || versionData.browserslist) {
    analysis.browser = true;
    if (typeof versionData.browser === 'string') {
      analysis.details.push(`Browser entry: ${versionData.browser}`);
    } else {
      analysis.details.push('Browser support via browser field');
    }
  }

  // Check exports for browser
  if (versionData.exports) {
    const exportsStr = JSON.stringify(versionData.exports);
    if (exportsStr.includes('browser')) {
      analysis.browser = true;
      analysis.details.push('Browser support in exports');
    }
  }

  // Check for Deno support
  if (versionData.keywords?.includes('deno') || versionData.deno) {
    analysis.deno = true;
    analysis.details.push('Deno support');
  }

  // Check for Bun support
  if (versionData.keywords?.includes('bun')) {
    analysis.bun = true;
    analysis.details.push('Bun support');
  }

  // Check for React
  if (
    versionData.peerDependencies?.react ||
    versionData.dependencies?.react ||
    versionData.keywords?.includes('react')
  ) {
    analysis.react = true;
    analysis.details.push('React component/library');
  }

  // Check for React Native
  if (
    versionData.peerDependencies?.['react-native'] ||
    versionData.keywords?.includes('react-native')
  ) {
    analysis.reactNative = true;
    analysis.details.push('React Native support');
  }

  return analysis;
}

/**
 * Analyze package exports field
 */
function analyzeExports(versionData: any) {
  const analysis = {
    hasExports: false,
    conditionalExports: false,
    subpathExports: false,
    exports: null as any,
    details: [] as string[],
  };

  if (versionData.exports) {
    analysis.hasExports = true;
    analysis.exports = versionData.exports;

    // Check for conditional exports (import/require/types/default)
    const exportsStr = JSON.stringify(versionData.exports);
    if (
      exportsStr.includes('import') ||
      exportsStr.includes('require') ||
      exportsStr.includes('types')
    ) {
      analysis.conditionalExports = true;
      analysis.details.push('Conditional exports (import/require/types)');
    }

    // Check for subpath exports (./*)
    if (typeof versionData.exports === 'object') {
      const keys = Object.keys(versionData.exports);
      if (keys.some((k) => k.startsWith('./'))) {
        analysis.subpathExports = true;
        analysis.details.push('Subpath exports available');
        analysis.details.push(`Subpaths: ${keys.filter((k) => k.startsWith('./')).join(', ')}`);
      }
    }
  } else {
    analysis.details.push('No exports field (uses main/module)');
  }

  return analysis;
}

/**
 * Analyze build tools used
 */
function analyzeBuildTools(versionData: any) {
  const tools: string[] = [];

  const devDeps = versionData.devDependencies || {};

  if (devDeps.webpack) tools.push('Webpack');
  if (devDeps.rollup) tools.push('Rollup');
  if (devDeps.vite) tools.push('Vite');
  if (devDeps.esbuild) tools.push('esbuild');
  if (devDeps.tsup) tools.push('tsup');
  if (devDeps.tsc || devDeps.typescript) tools.push('TypeScript compiler');
  if (devDeps.babel || devDeps['@babel/core']) tools.push('Babel');
  if (devDeps.swc || devDeps['@swc/core']) tools.push('SWC');

  return {
    tools,
    details: tools.length > 0 ? `Built with: ${tools.join(', ')}` : 'Build tools not detected',
  };
}

/**
 * Analyze engine requirements
 */
function analyzeEngines(versionData: any) {
  const analysis = {
    node: null as string | null,
    npm: null as string | null,
    yarn: null as string | null,
    pnpm: null as string | null,
    details: [] as string[],
  };

  if (versionData.engines) {
    if (versionData.engines.node) {
      analysis.node = versionData.engines.node;
      analysis.details.push(`Node.js: ${versionData.engines.node}`);
    }
    if (versionData.engines.npm) {
      analysis.npm = versionData.engines.npm;
      analysis.details.push(`npm: ${versionData.engines.npm}`);
    }
    if (versionData.engines.yarn) {
      analysis.yarn = versionData.engines.yarn;
      analysis.details.push(`Yarn: ${versionData.engines.yarn}`);
    }
    if (versionData.engines.pnpm) {
      analysis.pnpm = versionData.engines.pnpm;
      analysis.details.push(`pnpm: ${versionData.engines.pnpm}`);
    }
  } else {
    analysis.details.push('No engine requirements specified');
  }

  return analysis;
}

/**
 * Generate human-readable summary
 */
function generateCapabilitiesSummary(capabilities: any): string {
  const lines: string[] = [];

  // Module system
  if (capabilities.moduleSystem.dualPackage) {
    lines.push('✅ Dual Package: ESM + CommonJS');
  } else if (capabilities.moduleSystem.esm) {
    lines.push('✅ ESM (ES Modules)');
  } else if (capabilities.moduleSystem.commonjs) {
    lines.push('✅ CommonJS');
  }

  // TypeScript
  if (capabilities.typescript.hasTypes) {
    lines.push('✅ TypeScript definitions included');
  } else {
    lines.push('⚠️ No TypeScript definitions (may need @types package)');
  }

  // Platform
  const platforms: string[] = [];
  if (capabilities.platform.node) platforms.push('Node.js');
  if (capabilities.platform.browser) platforms.push('Browser');
  if (capabilities.platform.deno) platforms.push('Deno');
  if (capabilities.platform.bun) platforms.push('Bun');
  if (platforms.length > 0) {
    lines.push(`✅ Platforms: ${platforms.join(', ')}`);
  }

  // Modern features
  if (capabilities.exports.hasExports) {
    lines.push('✅ Modern package (uses exports field)');
  }

  return lines.join('\n');
}
