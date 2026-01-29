import { z } from 'zod';
import { RegistryClient } from '../registry-client.js';
import type { SearchResponse } from '../types.js';

/**
 * Schema for package search parameters
 */
export const SearchPackagesSchema = z.object({
  query: z.string().min(1, 'Query must not be empty'),
  limit: z.number().int().min(1).max(50).default(10),
});

export type SearchPackagesParams = z.infer<typeof SearchPackagesSchema>;

/**
 * Search npm packages with popularity ranking
 */
export async function searchPackages(
  params: SearchPackagesParams,
  client: RegistryClient
): Promise<string> {
  // Validate input
  const validated = SearchPackagesSchema.parse(params);

  try {
    // Search packages using registry client
    const results: SearchResponse = await client.searchPackages(
      validated.query,
      { limit: validated.limit }
    );

    if (results.objects.length === 0) {
      return JSON.stringify({
        success: true,
        message: `No packages found matching "${validated.query}"`,
        packages: [],
        total: 0,
      });
    }

    // Format results with enriched information
    const packages = results.objects.map((obj) => ({
      name: obj.package.name,
      version: obj.package.version,
      description: obj.package.description || 'No description available',
      author: obj.package.author?.name || obj.package.publisher.name,
      keywords: obj.package.keywords || [],
      links: {
        npm: obj.package.links.npm,
        homepage: obj.package.links.homepage,
        repository: obj.package.links.repository,
      },
      score: {
        final: Math.round(obj.score.final * 100),
        quality: Math.round(obj.score.detail.quality * 100),
        popularity: Math.round(obj.score.detail.popularity * 100),
        maintenance: Math.round(obj.score.detail.maintenance * 100),
      },
      publishedAt: obj.package.date,
    }));

    // Sort by final score (already sorted by npm API, but ensure consistency)
    packages.sort((a, b) => b.score.final - a.score.final);

    return JSON.stringify(
      {
        success: true,
        query: validated.query,
        packages,
        total: results.total,
        returned: packages.length,
        message: `Found ${results.total} packages. Showing top ${packages.length}.`,
      },
      null,
      2
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return JSON.stringify({
      success: false,
      error: errorMessage,
      query: validated.query,
    });
  }
}
