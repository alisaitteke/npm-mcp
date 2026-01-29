import { z } from 'zod';
import { RegistryClient } from '../registry-client.js';

/**
 * Schema for bundle size analysis
 */
export const AnalyzeBundleSizeSchema = z.object({
  packageName: z.string().min(1, 'Package name must not be empty'),
  version: z.string().optional(),
});

export type AnalyzeBundleSizeParams = z.infer<typeof AnalyzeBundleSizeSchema>;

/**
 * Analyze bundle size impact
 * Uses bundlephobia.com API for real bundle size data
 */
export async function analyzeBundleSize(
  params: AnalyzeBundleSizeParams,
  client: RegistryClient
): Promise<string> {
  const validated = AnalyzeBundleSizeSchema.parse(params);

  try {
    // Fetch package data
    const packument = await client.getPackage(validated.packageName);
    const targetVersion = validated.version || packument['dist-tags'].latest;
    const versionData = packument.versions[targetVersion];

    if (!versionData) {
      return JSON.stringify({
        success: false,
        error: `Version ${targetVersion} not found`,
      });
    }

    // Get size from dist.unpackedSize
    const unpackedSize = versionData.dist?.unpackedSize || 0;
    
    // Fetch from bundlephobia API
    let bundleData = null;
    try {
      const response = await fetch(
        `https://bundlephobia.com/api/size?package=${validated.packageName}@${targetVersion}`,
        {
          headers: {
            'User-Agent': 'npm-registry-mcp/1.0.0',
          },
        }
      );

      if (response.ok) {
        bundleData = await response.json();
      }
    } catch (error) {
      // Bundlephobia might be down or package not found
      bundleData = null;
    }

    const analysis = {
      success: true,
      package: {
        name: validated.packageName,
        version: targetVersion,
      },
      sizes: {
        unpacked: formatBytes(unpackedSize),
        minified: bundleData ? formatBytes(bundleData.size) : 'Unknown',
        gzip: bundleData ? formatBytes(bundleData.gzip) : 'Unknown',
      },
      impact: analyzeSizeImpact(unpackedSize, bundleData),
      dependencies: {
        count: Object.keys(versionData.dependencies || {}).length,
        list: Object.keys(versionData.dependencies || {}),
      },
      treeshaking: analyzeTreeshaking(versionData),
      recommendations: generateSizeRecommendations(unpackedSize, bundleData, versionData),
    };

    return JSON.stringify(analysis, null, 2);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return JSON.stringify({
      success: false,
      error: errorMessage,
      packageName: validated.packageName,
    });
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function analyzeSizeImpact(unpackedSize: number, bundleData: any): object {
  const gzipSize = bundleData?.gzip || unpackedSize * 0.3; // Estimate if unknown

  let impact = 'Unknown';
  let rating = '?';

  if (gzipSize < 10000) {
    // < 10KB
    impact = 'Minimal';
    rating = '✅ Excellent';
  } else if (gzipSize < 50000) {
    // < 50KB
    impact = 'Low';
    rating = '✅ Good';
  } else if (gzipSize < 100000) {
    // < 100KB
    impact = 'Moderate';
    rating = '⚠️ Medium';
  } else if (gzipSize < 500000) {
    // < 500KB
    impact = 'High';
    rating = '⚠️ Large';
  } else {
    impact = 'Very High';
    rating = '❌ Very Large';
  }

  return {
    level: impact,
    rating,
    gzipBytes: gzipSize,
    description: `This package will add approximately ${formatBytes(gzipSize)} to your bundle (gzipped)`,
  };
}

function analyzeTreeshaking(versionData: any): object {
  const hasESM = versionData.type === 'module' || versionData.module || versionData.exports;
  const hasSideEffects = versionData.sideEffects !== false;

  return {
    supported: hasESM && !hasSideEffects,
    hasESM,
    hasSideEffects,
    description: hasESM && !hasSideEffects
      ? '✅ Supports tree-shaking (ESM + no side effects)'
      : hasESM
      ? '⚠️ ESM but may have side effects'
      : '❌ CommonJS - no tree-shaking',
  };
}

function generateSizeRecommendations(
  unpackedSize: number,
  bundleData: any,
  versionData: any
): string[] {
  const recommendations: string[] = [];

  const gzipSize = bundleData?.gzip || unpackedSize * 0.3;

  // Size warnings
  if (gzipSize > 100000) {
    recommendations.push('⚠️ Large bundle size - consider alternatives or code splitting');
  }

  if (gzipSize > 500000) {
    recommendations.push('❌ Very large! This will significantly impact load time');
  }

  // Tree-shaking
  const hasESM = versionData.type === 'module' || versionData.module;
  if (!hasESM) {
    recommendations.push('💡 Package uses CommonJS - look for ESM version for better tree-shaking');
  }

  if (versionData.sideEffects !== false) {
    recommendations.push('💡 Package may have side effects - tree-shaking might be limited');
  }

  // Dependencies
  const depCount = Object.keys(versionData.dependencies || {}).length;
  if (depCount > 10) {
    recommendations.push(`⚠️ Has ${depCount} dependencies - increases bundle size`);
  }

  // Module exports
  if (versionData.exports) {
    recommendations.push('✅ Uses exports field - import only what you need');
  }

  // Alternatives suggestion
  if (gzipSize > 50000) {
    recommendations.push('💡 Consider lighter alternatives or lodash-style per-method imports');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Bundle size is reasonable');
  }

  return recommendations;
}
