import { z } from 'zod';
import { RegistryClient } from '../registry-client.js';
import type { Packument } from '../types.js';
import semver from 'semver';

/**
 * Schema for version comparison parameters
 */
export const CompareVersionsSchema = z.object({
  packageName: z.string().min(1, 'Package name must not be empty'),
  fromVersion: z.string().min(1, 'From version must not be empty'),
  toVersion: z.string().min(1, 'To version must not be empty'),
});

export type CompareVersionsParams = z.infer<typeof CompareVersionsSchema>;

/**
 * Schema for compatibility check parameters
 */
export const CheckCompatibilitySchema = z.object({
  packageName: z.string().min(1, 'Package name must not be empty'),
  version: z.string().optional(),
  existingDependencies: z.record(z.string(), z.string()),
});

export type CheckCompatibilityParams = z.infer<typeof CheckCompatibilitySchema>;

/**
 * Compare two versions of a package
 */
export async function compareVersions(
  params: CompareVersionsParams,
  client: RegistryClient
): Promise<string> {
  const validated = CompareVersionsSchema.parse(params);

  try {
    const packument: Packument = await client.getPackage(validated.packageName);

    const fromVer = packument.versions[validated.fromVersion];
    const toVer = packument.versions[validated.toVersion];

    if (!fromVer) {
      return JSON.stringify({
        success: false,
        error: `Version ${validated.fromVersion} not found`,
      });
    }

    if (!toVer) {
      return JSON.stringify({
        success: false,
        error: `Version ${validated.toVersion} not found`,
      });
    }

    // Determine version type change
    const diff = semver.diff(validated.fromVersion, validated.toVersion);
    const isUpgrade = semver.gt(validated.toVersion, validated.fromVersion);

    // Compare dependencies
    const fromDeps = fromVer.dependencies || {};
    const toDeps = toVer.dependencies || {};

    const addedDeps: Record<string, string> = {};
    const removedDeps: Record<string, string> = {};
    const changedDeps: Record<string, { from: string; to: string }> = {};

    // Find added and changed dependencies
    for (const [dep, toVersion] of Object.entries(toDeps)) {
      if (!fromDeps[dep]) {
        addedDeps[dep] = toVersion;
      } else if (fromDeps[dep] !== toVersion) {
        changedDeps[dep] = { from: fromDeps[dep], to: toVersion };
      }
    }

    // Find removed dependencies
    for (const [dep, fromVersion] of Object.entries(fromDeps)) {
      if (!toDeps[dep]) {
        removedDeps[dep] = fromVersion;
      }
    }

    // Compare peer dependencies
    const fromPeers = fromVer.peerDependencies || {};
    const toPeers = toVer.peerDependencies || {};

    const peerChanges: Record<string, { from?: string; to?: string }> = {};
    const allPeers = new Set([
      ...Object.keys(fromPeers),
      ...Object.keys(toPeers),
    ]);

    for (const peer of allPeers) {
      const fromPeer = fromPeers[peer];
      const toPeer = toPeers[peer];
      if (fromPeer !== toPeer) {
        peerChanges[peer] = { from: fromPeer, to: toPeer };
      }
    }

    const result = {
      success: true,
      package: validated.packageName,
      comparison: {
        from: validated.fromVersion,
        to: validated.toVersion,
        type: isUpgrade ? 'upgrade' : 'downgrade',
        changeType: diff || 'unknown',
        isBreaking: diff === 'major',
        publishedDates: {
          from: packument.time[validated.fromVersion],
          to: packument.time[validated.toVersion],
        },
      },
      dependencyChanges: {
        added: Object.keys(addedDeps).length,
        removed: Object.keys(removedDeps).length,
        changed: Object.keys(changedDeps).length,
        details: {
          added: addedDeps,
          removed: removedDeps,
          changed: changedDeps,
        },
      },
      peerDependencyChanges: {
        total: Object.keys(peerChanges).length,
        details: peerChanges,
      },
      recommendation:
        diff === 'major'
          ? 'Major version change detected. Review changelog and test thoroughly.'
          : diff === 'minor'
          ? 'Minor version change. New features added, should be backward compatible.'
          : diff === 'patch'
          ? 'Patch version change. Bug fixes only, safe to upgrade.'
          : 'Version comparison complete.',
    };

    return JSON.stringify(result, null, 2);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return JSON.stringify({
      success: false,
      error: errorMessage,
    });
  }
}

/**
 * Check compatibility with existing dependencies
 */
export async function checkCompatibility(
  params: CheckCompatibilityParams,
  client: RegistryClient
): Promise<string> {
  const validated = CheckCompatibilitySchema.parse(params);

  try {
    const packument: Packument = await client.getPackage(validated.packageName);

    // Determine target version
    const targetVersion =
      validated.version || packument['dist-tags'].latest || 'latest';

    const versionData = packument.versions[targetVersion];

    if (!versionData) {
      return JSON.stringify({
        success: false,
        error: `Version ${targetVersion} not found`,
      });
    }

    // Get peer dependencies of target package
    const peerDeps = versionData.peerDependencies || {};

    // Check for conflicts
    const conflicts: Array<{
      package: string;
      required: string;
      existing: string;
      compatible: boolean;
      reason: string;
    }> = [];

    const compatible: Array<{
      package: string;
      required: string;
      existing: string;
    }> = [];

    const missing: Array<{
      package: string;
      required: string;
    }> = [];

    // Check each peer dependency
    for (const [peerPkg, peerRange] of Object.entries(peerDeps)) {
      const existingVersion = validated.existingDependencies[peerPkg];

      if (!existingVersion) {
        missing.push({
          package: peerPkg,
          required: peerRange,
        });
        continue;
      }

      // Clean version for comparison (remove ^ ~ etc)
      const cleanExisting = existingVersion.replace(/^[\^~>=<]/, '');

      try {
        if (semver.satisfies(cleanExisting, peerRange)) {
          compatible.push({
            package: peerPkg,
            required: peerRange,
            existing: existingVersion,
          });
        } else {
          conflicts.push({
            package: peerPkg,
            required: peerRange,
            existing: existingVersion,
            compatible: false,
            reason: `Existing version ${existingVersion} does not satisfy required range ${peerRange}`,
          });
        }
      } catch (error) {
        conflicts.push({
          package: peerPkg,
          required: peerRange,
          existing: existingVersion,
          compatible: false,
          reason: `Unable to validate version compatibility`,
        });
      }
    }

    // Check if any of the existing dependencies depend on conflicting versions
    const potentialIssues: string[] = [];

    // If adding this package would create a conflict
    if (conflicts.length > 0) {
      potentialIssues.push(
        `${conflicts.length} peer dependency conflict(s) detected`
      );
    }

    if (missing.length > 0) {
      potentialIssues.push(
        `${missing.length} required peer dependency(ies) not installed`
      );
    }

    const isCompatible = conflicts.length === 0 && missing.length === 0;

    const result = {
      success: true,
      package: validated.packageName,
      version: targetVersion,
      compatible: isCompatible,
      analysis: {
        peerDependencies: {
          total: Object.keys(peerDeps).length,
          compatible: compatible.length,
          conflicts: conflicts.length,
          missing: missing.length,
        },
        details: {
          compatible,
          conflicts,
          missing,
        },
      },
      recommendation: isCompatible
        ? 'Package is compatible with existing dependencies. Safe to install.'
        : `Compatibility issues detected. ${potentialIssues.join('. ')}.`,
      suggestedActions: !isCompatible
        ? [
            conflicts.length > 0
              ? 'Update conflicting dependencies to compatible versions'
              : null,
            missing.length > 0
              ? `Install missing peer dependencies: ${missing.map((m) => `${m.package}@${m.required}`).join(', ')}`
              : null,
          ].filter(Boolean)
        : [],
    };

    return JSON.stringify(result, null, 2);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return JSON.stringify({
      success: false,
      error: errorMessage,
    });
  }
}
