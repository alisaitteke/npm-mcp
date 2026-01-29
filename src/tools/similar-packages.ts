import { z } from 'zod';
import { RegistryClient } from '../registry-client.js';

/**
 * Schema for finding similar packages
 */
export const FindSimilarPackagesSchema = z.object({
  packageName: z.string().min(1, 'Package name must not be empty'),
  limit: z.number().min(1).max(10).optional().default(5),
});

export type FindSimilarPackagesParams = z.infer<typeof FindSimilarPackagesSchema>;

/**
 * Find similar/alternative packages
 */
export async function findSimilarPackages(
  params: FindSimilarPackagesParams,
  client: RegistryClient
): Promise<string> {
  const validated = FindSimilarPackagesSchema.parse(params);

  try {
    // Get original package
    const packument = await client.getPackage(validated.packageName);
    const latest = packument['dist-tags'].latest;
    const versionData = packument.versions[latest];

    // Extract keywords and description
    const keywords = versionData.keywords || packument.keywords || [];
    const description = versionData.description || packument.description || '';

    // Search for similar packages based on keywords
    const searchQueries = generateSearchQueries(validated.packageName, keywords, description);
    
    const similarPackages = await findSimilarByKeywords(
      client,
      searchQueries,
      validated.packageName,
      validated.limit
    );

    return JSON.stringify(
      {
        success: true,
        original: {
          name: validated.packageName,
          version: latest,
          description,
          keywords,
        },
        similar: similarPackages,
        searchStrategy: {
          queries: searchQueries,
          method: 'keyword-based search',
        },
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
      packageName: validated.packageName,
    });
  }
}

function generateSearchQueries(packageName: string, keywords: string[], description: string): string[] {
  const queries: string[] = [];

  // Use package name base (without scope)
  const baseName = packageName.replace(/^@[^/]+\//, '');
  
  // Use keywords
  if (keywords.length > 0) {
    queries.push(keywords.slice(0, 3).join(' '));
  }

  // Extract key terms from description
  if (description) {
    const terms = description
      .toLowerCase()
      .match(/\b(library|framework|tool|utility|client|server|api|http|state|data|form|validation)\b/g);
    if (terms && terms.length > 0) {
      queries.push(terms.slice(0, 2).join(' '));
    }
  }

  // Fallback to package name
  if (queries.length === 0) {
    queries.push(baseName);
  }

  return queries;
}

async function findSimilarByKeywords(
  client: RegistryClient,
  queries: string[],
  originalPackage: string,
  limit: number
): Promise<any[]> {
  const seen = new Set([originalPackage]);
  const results: any[] = [];

  // Search using each query
  for (const query of queries) {
    if (results.length >= limit) break;

    try {
      const searchResult = await client.searchPackages(query, { limit: 20 });
      
      for (const item of searchResult.objects) {
        if (results.length >= limit) break;
        if (seen.has(item.package.name)) continue;

        seen.add(item.package.name);
        
        // Get more details
        try {
          const downloads = await client.getDownloadStats(item.package.name, 'last-week');
          
          results.push({
            name: item.package.name,
            version: item.package.version,
            description: item.package.description,
            score: Math.round(item.score.final * 100),
            downloads: downloads.downloads,
            similarity: calculateSimilarity(item, originalPackage),
          });
        } catch {
          results.push({
            name: item.package.name,
            version: item.package.version,
            description: item.package.description,
            score: Math.round(item.score.final * 100),
            downloads: 0,
            similarity: 'Unknown',
          });
        }
      }
    } catch (error) {
      // Skip failed queries
      continue;
    }
  }

  // Sort by score + downloads
  results.sort((a, b) => {
    const scoreA = a.score + Math.log10(a.downloads + 1);
    const scoreB = b.score + Math.log10(b.downloads + 1);
    return scoreB - scoreA;
  });

  return results.slice(0, limit);
}

function calculateSimilarity(item: any, originalPackage: string): string {
  // Simple similarity based on keywords overlap
  // In real implementation, could use more sophisticated algorithms
  return 'Alternative';
}
