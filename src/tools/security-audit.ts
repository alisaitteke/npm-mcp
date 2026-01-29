import { z } from 'zod';
import { RegistryClient } from '../registry-client.js';
import type { Packument } from '../types.js';

/**
 * Schema for security audit parameters
 */
export const AuditSecuritySchema = z.object({
  packageName: z.string().min(1, 'Package name must not be empty'),
  version: z.string().optional(),
});

export type AuditSecurityParams = z.infer<typeof AuditSecuritySchema>;

/**
 * Audit package for security vulnerabilities
 * Uses npm registry API to check for known advisories
 */
export async function auditSecurity(
  params: AuditSecurityParams,
  client: RegistryClient
): Promise<string> {
  const validated = AuditSecuritySchema.parse(params);

  try {
    // Fetch package information
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

    // Fetch vulnerability data from npm registry
    // The registry provides advisory information via special endpoints
    const advisoryUrl = `https://registry.npmjs.org/-/npm/v1/security/advisories/bulk`;

    try {
      const response = await fetch(advisoryUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [validated.packageName]: [targetVersion],
        }),
      });

      let vulnerabilities: any = {};
      if (response.ok) {
        vulnerabilities = await response.json();
      }

      // Analyze dependencies for vulnerabilities
      const dependencies = {
        ...versionData.dependencies,
        ...versionData.devDependencies,
      };

      const totalDependencies = Object.keys(dependencies).length;

      // Build vulnerability report
      const advisories = vulnerabilities[validated.packageName] || {};
      const advisoryList = Object.values(advisories);

      // Categorize by severity
      const severityCounts = {
        critical: 0,
        high: 0,
        moderate: 0,
        low: 0,
        info: 0,
      };

      const vulnerabilityDetails: any[] = [];

      for (const advisory of advisoryList) {
        const adv = advisory as any;
        const severity = adv.severity?.toLowerCase() || 'unknown';

        if (severity in severityCounts) {
          severityCounts[severity as keyof typeof severityCounts]++;
        }

        vulnerabilityDetails.push({
          id: adv.id,
          title: adv.title,
          severity: adv.severity,
          vulnerableVersions: adv.vulnerable_versions,
          patchedVersions: adv.patched_versions,
          recommendation: adv.recommendation,
          cves: adv.cves || [],
          cvss: adv.cvss,
        });
      }

      const totalVulnerabilities = vulnerabilityDetails.length;
      const hasVulnerabilities = totalVulnerabilities > 0;

      // Generate recommendations
      const recommendations: string[] = [];

      if (hasVulnerabilities) {
        if (severityCounts.critical > 0) {
          recommendations.push(
            '🚨 Critical vulnerabilities found! Update immediately.'
          );
        }
        if (severityCounts.high > 0) {
          recommendations.push('⚠️ High severity vulnerabilities require attention.');
        }

        // Find safe versions
        const allVersions = Object.keys(packument.versions).filter((v) => {
          // Simple check - you might want more sophisticated logic
          return !vulnerabilityDetails.some((vuln) =>
            vuln.vulnerableVersions?.includes(v)
          );
        });

        if (allVersions.length > 0) {
          const latestSafe = allVersions[allVersions.length - 1];
          recommendations.push(`Consider upgrading to ${latestSafe}`);
        }
      } else {
        recommendations.push('✅ No known vulnerabilities found for this version.');
      }

      const result = {
        success: true,
        package: validated.packageName,
        version: targetVersion,
        security: {
          hasVulnerabilities,
          totalVulnerabilities,
          severity: severityCounts,
          score: hasVulnerabilities
            ? Math.max(
                0,
                100 -
                  (severityCounts.critical * 40 +
                    severityCounts.high * 20 +
                    severityCounts.moderate * 10 +
                    severityCounts.low * 5)
              )
            : 100,
        },
        vulnerabilities: vulnerabilityDetails,
        dependencies: {
          total: totalDependencies,
          direct: Object.keys(versionData.dependencies || {}).length,
          dev: Object.keys(versionData.devDependencies || {}).length,
        },
        recommendations,
        auditedAt: new Date().toISOString(),
      };

      return JSON.stringify(result, null, 2);
    } catch (fetchError) {
      // If advisory API fails, provide basic info
      return JSON.stringify({
        success: true,
        package: validated.packageName,
        version: targetVersion,
        security: {
          hasVulnerabilities: false,
          totalVulnerabilities: 0,
          severity: {
            critical: 0,
            high: 0,
            moderate: 0,
            low: 0,
            info: 0,
          },
          score: 100,
        },
        vulnerabilities: [],
        dependencies: {
          total: Object.keys({
            ...versionData.dependencies,
            ...versionData.devDependencies,
          }).length,
          direct: Object.keys(versionData.dependencies || {}).length,
          dev: Object.keys(versionData.devDependencies || {}).length,
        },
        recommendations: [
          '⚠️ Unable to fetch vulnerability data from npm registry.',
          'Package information retrieved successfully.',
        ],
        note: 'Vulnerability check unavailable. Package metadata only.',
        auditedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return JSON.stringify({
      success: false,
      error: errorMessage,
    });
  }
}
