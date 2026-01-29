import { z } from 'zod';
import { RegistryClient } from '../registry-client.js';
import type { Packument } from '../types.js';
import { Octokit } from '@octokit/rest';

/**
 * Schema for quality analysis parameters
 */
export const AnalyzeQualitySchema = z.object({
  packageName: z.string().min(1, 'Package name must not be empty'),
});

export type AnalyzeQualityParams = z.infer<typeof AnalyzeQualitySchema>;

/**
 * Analyze package quality metrics
 */
export async function analyzeQuality(
  params: AnalyzeQualityParams,
  client: RegistryClient
): Promise<string> {
  const validated = AnalyzeQualitySchema.parse(params);

  try {
    // Fetch package metadata
    const packument: Packument = await client.getPackage(validated.packageName);
    const latestVersion = packument['dist-tags'].latest;

    // Get download statistics
    let weeklyDownloads = 0;
    let monthlyDownloads = 0;

    try {
      const weekStats = await client.getDownloadStats(
        validated.packageName,
        'last-week'
      );
      weeklyDownloads = weekStats.downloads;

      const monthStats = await client.getDownloadStats(
        validated.packageName,
        'last-month'
      );
      monthlyDownloads = monthStats.downloads;
    } catch (error) {
      // Downloads might not be available for all packages
    }

    // Extract repository information
    const repository = packument.repository;
    let repoUrl: string | null = null;
    let repoOwner: string | null = null;
    let repoName: string | null = null;

    if (repository?.url) {
      const url = repository.url
        .replace('git+', '')
        .replace('git://', 'https://')
        .replace('git@github.com:', 'https://github.com/')
        .replace('.git', '');

      repoUrl = url;

      // Extract owner and repo name from GitHub URL
      const githubMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (githubMatch) {
        repoOwner = githubMatch[1];
        repoName = githubMatch[2];
      }
    }

    // GitHub metrics (if available)
    let githubMetrics: any = null;

    if (repoOwner && repoName) {
      try {
        const octokit = new Octokit();
        const { data: repo } = await octokit.repos.get({
          owner: repoOwner,
          repo: repoName,
        });

        githubMetrics = {
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          watchers: repo.watchers_count,
          openIssues: repo.open_issues_count,
          lastPush: repo.pushed_at,
          isArchived: repo.archived,
          hasIssues: repo.has_issues,
          defaultBranch: repo.default_branch,
        };
      } catch (error) {
        // GitHub API might fail (rate limiting, private repo, etc.)
        githubMetrics = null;
      }
    }

    // Analyze version history
    const allVersions = Object.keys(packument.versions);
    const versionCount = allVersions.length;

    const firstVersion = packument.time.created;
    const lastPublished = packument.time.modified;
    const latestVersionDate = packument.time[latestVersion];

    // Calculate maintenance score
    const now = Date.now();
    const lastPublishedDate = new Date(lastPublished).getTime();
    const daysSinceLastPublish = (now - lastPublishedDate) / (1000 * 60 * 60 * 24);

    // Maintenance score (0-100)
    let maintenanceScore = 100;
    if (daysSinceLastPublish > 365) maintenanceScore = 20;
    else if (daysSinceLastPublish > 180) maintenanceScore = 50;
    else if (daysSinceLastPublish > 90) maintenanceScore = 70;
    else if (daysSinceLastPublish > 30) maintenanceScore = 85;

    // Popularity score (0-100) based on downloads
    let popularityScore = 0;
    if (weeklyDownloads > 1000000) popularityScore = 100;
    else if (weeklyDownloads > 500000) popularityScore = 90;
    else if (weeklyDownloads > 100000) popularityScore = 80;
    else if (weeklyDownloads > 50000) popularityScore = 70;
    else if (weeklyDownloads > 10000) popularityScore = 60;
    else if (weeklyDownloads > 5000) popularityScore = 50;
    else if (weeklyDownloads > 1000) popularityScore = 40;
    else if (weeklyDownloads > 100) popularityScore = 30;
    else if (weeklyDownloads > 10) popularityScore = 20;
    else popularityScore = 10;

    // Community score (0-100) based on GitHub metrics
    let communityScore = 50; // Default if no GitHub data
    if (githubMetrics) {
      const starsScore = Math.min((githubMetrics.stars / 10000) * 100, 100);
      const forksScore = Math.min((githubMetrics.forks / 1000) * 100, 100);
      const activeScore = githubMetrics.isArchived ? 0 : 100;

      communityScore = (starsScore * 0.5 + forksScore * 0.3 + activeScore * 0.2);
    }

    // Overall quality score (weighted average)
    const overallScore = Math.round(
      popularityScore * 0.4 + maintenanceScore * 0.4 + communityScore * 0.2
    );

    const result = {
      success: true,
      package: validated.packageName,
      version: latestVersion,
      scores: {
        overall: overallScore,
        popularity: Math.round(popularityScore),
        maintenance: Math.round(maintenanceScore),
        community: Math.round(communityScore),
      },
      metrics: {
        downloads: {
          weekly: weeklyDownloads.toLocaleString(),
          monthly: monthlyDownloads.toLocaleString(),
        },
        versions: {
          total: versionCount,
          latest: latestVersion,
          firstPublished: firstVersion,
          lastPublished: lastPublished,
          daysSinceLastPublish: Math.round(daysSinceLastPublish),
        },
        github: githubMetrics
          ? {
              url: repoUrl,
              stars: githubMetrics.stars.toLocaleString(),
              forks: githubMetrics.forks.toLocaleString(),
              openIssues: githubMetrics.openIssues.toLocaleString(),
              lastPush: githubMetrics.lastPush,
              isArchived: githubMetrics.isArchived,
            }
          : null,
        maintainers: packument.maintainers?.length || 0,
        license: packument.license || 'Unknown',
      },
      assessment: getQualityAssessment(
        overallScore,
        daysSinceLastPublish,
        weeklyDownloads,
        githubMetrics
      ),
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
 * Generate quality assessment text
 */
function getQualityAssessment(
  overallScore: number,
  daysSinceLastPublish: number,
  weeklyDownloads: number,
  githubMetrics: any
): string[] {
  const assessment: string[] = [];

  // Overall assessment
  if (overallScore >= 80) {
    assessment.push('✅ High quality package with strong community support.');
  } else if (overallScore >= 60) {
    assessment.push('✓ Good quality package, suitable for production use.');
  } else if (overallScore >= 40) {
    assessment.push('⚠️ Moderate quality. Review carefully before using.');
  } else {
    assessment.push('❌ Low quality or unmaintained. Consider alternatives.');
  }

  // Maintenance
  if (daysSinceLastPublish > 365) {
    assessment.push('📅 Not actively maintained (1+ year since last update).');
  } else if (daysSinceLastPublish > 180) {
    assessment.push('📅 Infrequently updated (6+ months since last update).');
  } else if (daysSinceLastPublish < 30) {
    assessment.push('🔄 Actively maintained with recent updates.');
  }

  // Popularity
  if (weeklyDownloads > 100000) {
    assessment.push('📈 Very popular with high weekly downloads.');
  } else if (weeklyDownloads > 10000) {
    assessment.push('📊 Popular package with good adoption.');
  } else if (weeklyDownloads < 100) {
    assessment.push('📉 Low download numbers. Verify if suitable for your needs.');
  }

  // GitHub
  if (githubMetrics) {
    if (githubMetrics.isArchived) {
      assessment.push('🗄️ Repository is archived. Package is no longer maintained.');
    } else if (githubMetrics.stars > 10000) {
      assessment.push('⭐ Strong community support on GitHub.');
    }
  } else {
    assessment.push('ℹ️ No GitHub repository found or accessible.');
  }

  return assessment;
}
