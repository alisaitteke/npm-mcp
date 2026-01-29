import { z } from 'zod';
import { RegistryClient } from '../registry-client.js';
import type { Packument } from '../types.js';
import semver from 'semver';

/**
 * Schema for package details parameters
 */
export const PackageDetailsSchema = z.object({
  packageName: z.string().min(1, 'Package name must not be empty'),
  version: z.string().optional(),
});

export type PackageDetailsParams = z.infer<typeof PackageDetailsSchema>;

/**
 * Get comprehensive package details
 */
export async function getPackageDetails(
  params: PackageDetailsParams,
  client: RegistryClient
): Promise<string> {
  // Validate input
  const validated = PackageDetailsSchema.parse(params);

  try {
    // Fetch full packument
    const packument: Packument = await client.getPackage(validated.packageName);

    // Determine target version
    const targetVersion =
      validated.version || packument['dist-tags'].latest || 'latest';

    // Get specific version data
    const versionData = packument.versions[targetVersion];

    if (!versionData) {
      return JSON.stringify({
        success: false,
        error: `Version ${targetVersion} not found for package ${validated.packageName}`,
        availableVersions: Object.keys(packument.versions)
          .sort((a, b) => {
            // Sort by semver
            try {
              return semver.rcompare(a, b);
            } catch {
              return b.localeCompare(a);
            }
          })
          .slice(0, 10),
      });
    }

    // Get download stats
    let downloadStats = null;
    try {
      downloadStats = await client.getDownloadStats(
        validated.packageName,
        'last-week'
      );
    } catch (error) {
      // Downloads API might fail for unpopular packages
      downloadStats = null;
    }

    // Extract all available versions sorted by semver
    const allVersions = Object.keys(packument.versions)
      .filter((v) => semver.valid(v))
      .sort((a, b) => semver.rcompare(a, b));

    // Get recent versions (last 5)
    const recentVersions = allVersions.slice(0, 5).map((v) => ({
      version: v,
      publishedAt: packument.time[v],
    }));

    // Deprecation: npm packument includes deprecated on version
    const deprecated =
      'deprecated' in versionData && versionData.deprecated !== undefined
        ? versionData.deprecated === true
          ? 'This version is deprecated.'
          : String(versionData.deprecated)
        : null;

    // Build comprehensive response
    const details = {
      success: true,
      package: {
        name: packument.name,
        version: versionData.version,
        description: versionData.description || packument.description,
        isLatest: targetVersion === packument['dist-tags'].latest,
        deprecated,
      },
      metadata: {
        license: versionData.license || packument.license || 'Unknown',
        author: versionData.author || packument.author,
        maintainers: versionData.maintainers || packument.maintainers || [],
        keywords: versionData.keywords || packument.keywords || [],
        homepage: versionData.homepage || packument.homepage,
        repository: versionData.repository || packument.repository,
        bugs: versionData.bugs || packument.bugs,
      },
      versions: {
        latest: packument['dist-tags'].latest,
        tags: packument['dist-tags'],
        total: allVersions.length,
        recent: recentVersions,
        deprecatedVersions: Object.entries(packument.versions)
          .filter(([, v]) => v.deprecated !== undefined)
          .map(([v, data]) => ({
            version: v,
            message:
              data.deprecated === true ? 'Deprecated' : String(data.deprecated),
          })),
      },
      dependencies: {
        dependencies: versionData.dependencies || {},
        devDependencies: versionData.devDependencies || {},
        peerDependencies: versionData.peerDependencies || {},
        optionalDependencies: versionData.optionalDependencies || {},
      },
      dist: {
        tarball: versionData.dist.tarball,
        shasum: versionData.dist.shasum,
        integrity: versionData.dist.integrity,
        fileCount: versionData.dist.fileCount,
        unpackedSize: versionData.dist.unpackedSize
          ? `${(versionData.dist.unpackedSize / 1024).toFixed(2)} KB`
          : 'Unknown',
      },
      timestamps: {
        created: packument.time.created,
        modified: packument.time.modified,
        versionPublished: packument.time[targetVersion],
      },
      stats: downloadStats
        ? {
            weeklyDownloads: downloadStats.downloads.toLocaleString(),
            period: `${downloadStats.start} to ${downloadStats.end}`,
          }
        : {
            weeklyDownloads: 'Not available',
            period: 'N/A',
          },
    };

    return JSON.stringify(details, null, 2);
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
