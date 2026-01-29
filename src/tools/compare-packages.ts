import { z } from 'zod';
import { RegistryClient } from '../registry-client.js';

/**
 * Schema for package comparison
 */
export const ComparePackagesSchema = z.object({
  packages: z.array(z.string()).min(2, 'At least 2 packages required').max(5, 'Maximum 5 packages'),
});

export type ComparePackagesParams = z.infer<typeof ComparePackagesSchema>;

/**
 * Compare multiple packages
 */
export async function comparePackages(
  params: ComparePackagesParams,
  client: RegistryClient
): Promise<string> {
  const validated = ComparePackagesSchema.parse(params);

  try {
    // Fetch all packages
    const packages = await Promise.all(
      validated.packages.map(async (name) => {
        try {
          const packument = await client.getPackage(name);
          const latest = packument['dist-tags'].latest;
          const versionData = packument.versions[latest];
          
          // Get download stats
          let downloads = null;
          try {
            downloads = await client.getDownloadStats(name, 'last-week');
          } catch {}

          return {
            name,
            version: latest,
            data: versionData,
            packument,
            downloads: downloads?.downloads || 0,
          };
        } catch (error) {
          return {
            name,
            error: error instanceof Error ? error.message : 'Failed to fetch',
          };
        }
      })
    );

    // Generate comparison
    const comparison = {
      success: true,
      packages: validated.packages,
      comparison: {
        overview: generateOverview(packages),
        moduleSystem: compareModuleSystems(packages),
        typescript: compareTypeScript(packages),
        platform: comparePlatforms(packages),
        popularity: comparePopularity(packages),
        maintenance: compareMaintenance(packages),
        size: compareSizes(packages),
      },
      recommendation: generateRecommendation(packages),
    };

    return JSON.stringify(comparison, null, 2);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return JSON.stringify({
      success: false,
      error: errorMessage,
    });
  }
}

function generateOverview(packages: any[]): any[] {
  return packages.map((pkg) => {
    if (pkg.error) {
      return {
        name: pkg.name,
        error: pkg.error,
      };
    }

    return {
      name: pkg.name,
      version: pkg.version,
      description: pkg.data.description || 'No description',
      license: pkg.data.license || 'Unknown',
      downloads: pkg.downloads?.toLocaleString() || 'N/A',
    };
  });
}

function compareModuleSystems(packages: any[]): object {
  const result: any = {};

  packages.forEach((pkg) => {
    if (pkg.error) {
      result[pkg.name] = { error: pkg.error };
      return;
    }

    const hasESM = pkg.data.type === 'module' || pkg.data.module || pkg.data.exports;
    const hasCJS = pkg.data.main || !hasESM;
    const isDual = hasESM && hasCJS;

    result[pkg.name] = {
      esm: hasESM,
      commonjs: hasCJS,
      dual: isDual,
      summary: isDual ? 'Dual (ESM + CJS)' : hasESM ? 'ESM only' : 'CJS only',
    };
  });

  return result;
}

function compareTypeScript(packages: any[]): object {
  const result: any = {};

  packages.forEach((pkg) => {
    if (pkg.error) {
      result[pkg.name] = { error: pkg.error };
      return;
    }

    const hasTypes = !!(pkg.data.types || pkg.data.typings);
    result[pkg.name] = {
      hasTypes,
      location: pkg.data.types || pkg.data.typings || null,
      needsTypes: !hasTypes,
    };
  });

  return result;
}

function comparePlatforms(packages: any[]): object {
  const result: any = {};

  packages.forEach((pkg) => {
    if (pkg.error) {
      result[pkg.name] = { error: pkg.error };
      return;
    }

    result[pkg.name] = {
      node: !!(pkg.data.engines?.node || pkg.data.main),
      browser: !!(pkg.data.browser || pkg.data.browserslist),
      platforms: [],
    };

    if (result[pkg.name].node) result[pkg.name].platforms.push('Node.js');
    if (result[pkg.name].browser) result[pkg.name].platforms.push('Browser');
  });

  return result;
}

function comparePopularity(packages: any[]): object {
  const result: any = {};
  const maxDownloads = Math.max(...packages.map((p) => p.downloads || 0));

  packages.forEach((pkg) => {
    if (pkg.error) {
      result[pkg.name] = { error: pkg.error };
      return;
    }

    const score = maxDownloads > 0 ? (pkg.downloads / maxDownloads) * 100 : 0;
    result[pkg.name] = {
      weeklyDownloads: pkg.downloads?.toLocaleString() || '0',
      popularityScore: Math.round(score),
      relative: score > 75 ? 'Very popular' : score > 50 ? 'Popular' : score > 25 ? 'Moderate' : 'Less popular',
    };
  });

  return result;
}

function compareMaintenance(packages: any[]): object {
  const result: any = {};

  packages.forEach((pkg) => {
    if (pkg.error) {
      result[pkg.name] = { error: pkg.error };
      return;
    }

    const modified = new Date(pkg.packument.time.modified);
    const daysSinceUpdate = Math.floor(
      (Date.now() - modified.getTime()) / (1000 * 60 * 60 * 24)
    );

    result[pkg.name] = {
      lastUpdate: modified.toISOString().split('T')[0],
      daysSince: daysSinceUpdate,
      status:
        daysSinceUpdate < 30
          ? 'Recently updated'
          : daysSinceUpdate < 90
          ? 'Active'
          : daysSinceUpdate < 365
          ? 'Maintained'
          : 'Stale',
    };
  });

  return result;
}

function compareSizes(packages: any[]): object {
  const result: any = {};

  packages.forEach((pkg) => {
    if (pkg.error) {
      result[pkg.name] = { error: pkg.error };
      return;
    }

    const size = pkg.data.dist?.unpackedSize;
    result[pkg.name] = {
      unpackedSize: size ? `${(size / 1024).toFixed(2)} KB` : 'Unknown',
      bytes: size || 0,
    };
  });

  return result;
}

function generateRecommendation(packages: any[]): object {
  const validPackages = packages.filter((p) => !p.error);
  
  if (validPackages.length === 0) {
    return { message: 'No valid packages to compare' };
  }

  // Score each package
  const scores = validPackages.map((pkg) => {
    let score = 0;
    let reasons: string[] = [];

    // ESM support (+10)
    if (pkg.data.type === 'module' || pkg.data.exports) {
      score += 10;
      reasons.push('Modern ESM support');
    }

    // TypeScript (+10)
    if (pkg.data.types || pkg.data.typings) {
      score += 10;
      reasons.push('TypeScript support');
    }

    // Popularity (+20)
    if (pkg.downloads > 100000) {
      score += 20;
      reasons.push('Popular');
    } else if (pkg.downloads > 10000) {
      score += 10;
    }

    // Maintenance (+15)
    const daysSince = Math.floor(
      (Date.now() - new Date(pkg.packument.time.modified).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince < 30) {
      score += 15;
      reasons.push('Recently updated');
    } else if (daysSince < 90) {
      score += 10;
    }

    // Size (+5 for smaller)
    const size = pkg.data.dist?.unpackedSize || 0;
    if (size > 0 && size < 100000) {
      // < 100KB
      score += 5;
      reasons.push('Small size');
    }

    return {
      name: pkg.name,
      score,
      reasons,
    };
  });

  // Sort by score
  scores.sort((a, b) => b.score - a.score);

  return {
    winner: scores[0].name,
    scores: scores.map((s) => ({
      package: s.name,
      score: s.score,
      reasons: s.reasons,
    })),
    summary: `${scores[0].name} scores highest with ${scores[0].reasons.join(', ')}`,
  };
}
