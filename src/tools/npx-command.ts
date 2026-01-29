import { z } from 'zod';
import { spawn } from 'child_process';
import { RegistryClient } from '../registry-client.js';

/**
 * Schema for NPX command analysis parameters
 */
export const AnalyzeNpxCommandSchema = z.object({
  command: z.string().min(1, 'Command must not be empty'),
  args: z.array(z.string()).optional().default([]),
  timeout: z.number().int().min(1000).max(60000).optional().default(30000),
});

export type AnalyzeNpxCommandParams = z.infer<typeof AnalyzeNpxCommandSchema>;

/**
 * Analyze and validate NPX command (without executing it for security)
 */
export async function analyzeNpxCommand(
  params: AnalyzeNpxCommandParams,
  client: RegistryClient
): Promise<string> {
  const validated = AnalyzeNpxCommandSchema.parse(params);

  try {
    // Extract package name from command
    // npx package@version or npx package
    const packageMatch = validated.command.match(/^(@?[^@\s]+)(?:@([^\s]+))?$/);

    if (!packageMatch) {
      return JSON.stringify({
        success: false,
        error: 'Invalid package format. Use: package or package@version',
      });
    }

    const packageName = packageMatch[1];
    const requestedVersion = packageMatch[2];

    // Validate package exists
    let packument;
    try {
      packument = await client.getPackage(packageName);
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `Package '${packageName}' not found in npm registry`,
      });
    }

    // Determine target version
    const targetVersion =
      requestedVersion || packument['dist-tags'].latest || 'latest';

    const versionData = packument.versions[targetVersion];

    if (!versionData) {
      return JSON.stringify({
        success: false,
        error: `Version ${targetVersion} not found for ${packageName}`,
        availableVersions: Object.keys(packument.versions)
          .slice(0, 10)
          .join(', '),
      });
    }

    // Check if package has bin executables
    const binaries = versionData.main ? { [packageName]: versionData.main } : {};

    // Check package.json bin field (not available in packument, but we can infer)
    const hasBin = versionData.main !== undefined;

    // Analyze package for potential issues
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check package size
    const sizeInKB = (versionData.dist.unpackedSize || 0) / 1024;
    if (sizeInKB > 10000) {
      warnings.push(
        `⚠️ Large package size: ${sizeInKB.toFixed(0)} KB unpacked`
      );
    }

    // Check age
    const publishDate = new Date(
      packument.time[targetVersion] || packument.time.modified
    );
    const ageInDays =
      (Date.now() - publishDate.getTime()) / (1000 * 60 * 60 * 24);

    if (ageInDays > 365) {
      warnings.push(`📅 Package version is ${Math.round(ageInDays / 365)} year(s) old`);
    }

    // Check dependencies
    const depCount = Object.keys(versionData.dependencies || {}).length;
    if (depCount > 50) {
      warnings.push(`📦 Large dependency tree: ${depCount} dependencies`);
    }

    // Security check
    recommendations.push(
      '🔒 Always review package contents before executing'
    );
    recommendations.push('📝 Check package reputation and maintainer trust');

    if (depCount > 0) {
      recommendations.push(
        `⚠️ Package has ${depCount} dependencies - review them as well`
      );
    }

    // Build safe command suggestion
    const safeCommand = requestedVersion
      ? `npx ${packageName}@${requestedVersion}`
      : `npx ${packageName}@${packument['dist-tags'].latest}`;

    const fullCommand = `${safeCommand} ${validated.args.join(' ')}`.trim();

    const result = {
      success: true,
      analysis: {
        package: packageName,
        version: targetVersion,
        command: fullCommand,
        isLatest: targetVersion === packument['dist-tags'].latest,
      },
      validation: {
        packageExists: true,
        versionExists: true,
        hasExecutable: hasBin,
        sizeKB: Math.round(sizeInKB),
        dependencyCount: depCount,
        publishedDaysAgo: Math.round(ageInDays),
      },
      metadata: {
        description: versionData.description || 'No description available',
        license: versionData.license || packument.license || 'Unknown',
        author: versionData.author?.name || packument.author?.name || 'Unknown',
        repository: versionData.repository?.url || packument.repository?.url,
        homepage: versionData.homepage || packument.homepage,
      },
      warnings: warnings.length > 0 ? warnings : ['✅ No significant warnings'],
      recommendations,
      safeCommand: fullCommand,
      note: 'Command analyzed but not executed. Execute manually after review.',
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
 * Execute NPX command safely (optional, for future use)
 * Currently disabled for security - only analysis is performed
 */
async function executeNpxCommandSafely(
  packageName: string,
  args: string[],
  timeout: number
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const process = spawn('npx', [packageName, ...args], {
      timeout,
      shell: false,
      env: { ...process.env, CI: 'true' }, // Disable interactive prompts
    });

    let stdout = '';
    let stderr = '';

    process.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code || 0,
      });
    });

    process.on('error', (error) => {
      reject(error);
    });
  });
}
