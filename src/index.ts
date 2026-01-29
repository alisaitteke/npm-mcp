/*
 *
 *  * Copyright © 2026 Ali Sait Teke
 *  * All rights reserved.
 *
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { RegistryClient } from './registry-client.js';
import { searchPackages } from './tools/search-packages.js';
import { getPackageDetails } from './tools/package-details.js';
import {
  compareVersions,
  checkCompatibility,
} from './tools/version-compatibility.js';
import { auditSecurity } from './tools/security-audit.js';
import { analyzeQuality } from './tools/quality-analysis.js';
import { analyzeNpxCommand } from './tools/npx-command.js';
import { analyzeCapabilities } from './tools/package-capabilities.js';
import { generateQuickStart } from './tools/quick-start.js';
import { comparePackages } from './tools/compare-packages.js';
import { analyzeBundleSize } from './tools/bundle-size.js';
import { findSimilarPackages } from './tools/similar-packages.js';

/**
 * NPM Registry MCP Server
 * Provides tools for npm package search, analysis, security auditing, and compatibility checking
 */
class NpmRegistryServer {
  private server: Server;
  private registryClient: RegistryClient;
  private subscriptions: Set<string> = new Set();

  constructor() {
    this.server = new Server(
      {
        name: 'npm-registry-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
          resources: {},
        },
      }
    );

    // Initialize registry client
    this.registryClient = new RegistryClient();

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_packages',
          description:
            'Search npm registry for packages by name or keywords with popularity ranking',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query (package name or keywords)',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results (default: 10, max: 50)',
                default: 10,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'get_package_details',
          description:
            'Get detailed information about a specific npm package including versions, dependencies, and repository info',
          inputSchema: {
            type: 'object',
            properties: {
              packageName: {
                type: 'string',
                description: 'Name of the package',
              },
              version: {
                type: 'string',
                description: 'Specific version (optional, defaults to latest)',
              },
            },
            required: ['packageName'],
          },
        },
        {
          name: 'audit_security',
          description:
            'Check package for known security vulnerabilities and get recommendations',
          inputSchema: {
            type: 'object',
            properties: {
              packageName: {
                type: 'string',
                description: 'Name of the package to audit',
              },
              version: {
                type: 'string',
                description: 'Specific version to audit (optional)',
              },
            },
            required: ['packageName'],
          },
        },
        {
          name: 'check_compatibility',
          description:
            'Analyze compatibility of a package with existing project dependencies',
          inputSchema: {
            type: 'object',
            properties: {
              packageName: {
                type: 'string',
                description: 'Name of the package to check',
              },
              version: {
                type: 'string',
                description: 'Version or version range',
              },
              existingDependencies: {
                type: 'object',
                description: 'Existing package.json dependencies',
                additionalProperties: {
                  type: 'string',
                },
              },
            },
            required: ['packageName', 'existingDependencies'],
          },
        },
        {
          name: 'analyze_quality',
          description:
            'Evaluate package quality metrics including maintenance, popularity, and sustainability',
          inputSchema: {
            type: 'object',
            properties: {
              packageName: {
                type: 'string',
                description: 'Name of the package to analyze',
              },
            },
            required: ['packageName'],
          },
        },
        {
          name: 'analyze_npx_command',
          description:
            'Analyze and validate an npx command before execution (security check)',
          inputSchema: {
            type: 'object',
            properties: {
              command: {
                type: 'string',
                description:
                  'Package to analyze (e.g., "create-react-app" or "typescript@5.0.0")',
              },
              args: {
                type: 'array',
                description: 'Command arguments (optional)',
                items: {
                  type: 'string',
                },
              },
              timeout: {
                type: 'number',
                description: 'Timeout in milliseconds (default: 30000)',
                default: 30000,
              },
            },
            required: ['command'],
          },
        },
        {
          name: 'compare_versions',
          description:
            'Compare different versions of a package and analyze breaking changes',
          inputSchema: {
            type: 'object',
            properties: {
              packageName: {
                type: 'string',
                description: 'Name of the package',
              },
              fromVersion: {
                type: 'string',
                description: 'Starting version',
              },
              toVersion: {
                type: 'string',
                description: 'Target version',
              },
            },
            required: ['packageName', 'fromVersion', 'toVersion'],
          },
        },
        {
          name: 'analyze_capabilities',
          description:
            'Analyze package capabilities: ESM/CJS support, TypeScript, platforms (Node/Browser/Deno), exports, build tools',
          inputSchema: {
            type: 'object',
            properties: {
              packageName: {
                type: 'string',
                description: 'Name of the package to analyze',
              },
              version: {
                type: 'string',
                description: 'Specific version (optional, defaults to latest)',
              },
            },
            required: ['packageName'],
          },
        },
        {
          name: 'generate_quick_start',
          description:
            'Generate ready-to-use code examples for a package (installation, basic usage, framework-specific examples)',
          inputSchema: {
            type: 'object',
            properties: {
              packageName: {
                type: 'string',
                description: 'Name of the package',
              },
              version: {
                type: 'string',
                description: 'Specific version (optional)',
              },
              framework: {
                type: 'string',
                enum: ['vanilla', 'react', 'vue', 'svelte', 'express', 'fastify', 'next', 'auto'],
                description: 'Target framework (auto-detect if not specified)',
              },
            },
            required: ['packageName'],
          },
        },
        {
          name: 'compare_packages',
          description:
            'Compare multiple packages side-by-side (features, size, popularity, maintenance, TypeScript support)',
          inputSchema: {
            type: 'object',
            properties: {
              packages: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of package names to compare (2-5 packages)',
                minItems: 2,
                maxItems: 5,
              },
            },
            required: ['packages'],
          },
        },
        {
          name: 'analyze_bundle_size',
          description:
            'Analyze bundle size impact: minified, gzipped sizes, tree-shaking support, recommendations',
          inputSchema: {
            type: 'object',
            properties: {
              packageName: {
                type: 'string',
                description: 'Name of the package',
              },
              version: {
                type: 'string',
                description: 'Specific version (optional)',
              },
            },
            required: ['packageName'],
          },
        },
        {
          name: 'find_similar_packages',
          description:
            'Find similar/alternative packages based on keywords and functionality',
          inputSchema: {
            type: 'object',
            properties: {
              packageName: {
                type: 'string',
                description: 'Name of the package to find alternatives for',
              },
              limit: {
                type: 'number',
                description: 'Number of results (default: 5, max: 10)',
                default: 5,
              },
            },
            required: ['packageName'],
          },
        },
      ],
    }));

    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        {
          name: 'check_before_install',
          description: 'Security and compatibility check before installing a package',
          arguments: [
            {
              name: 'packageName',
              description: 'Package name to check',
              required: true,
            },
            {
              name: 'version',
              description: 'Package version (defaults to latest)',
              required: false,
            },
          ],
        },
        {
          name: 'find_package',
          description: 'Find and compare packages for a specific use case',
          arguments: [
            {
              name: 'useCase',
              description: 'What you need the package for (e.g., "date library", "state management")',
              required: true,
            },
          ],
        },
        {
          name: 'audit_project',
          description: 'Security audit for all dependencies in package.json',
          arguments: [
            {
              name: 'dependencies',
              description: 'JSON string of dependencies from package.json',
              required: true,
            },
          ],
        },
      ],
    }));

    // Handle prompt requests
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'check_before_install':
          return {
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Before installing ${args?.packageName}${args?.version ? `@${args.version}` : ''}, please:

1. Use audit_security to check for vulnerabilities
2. Use get_package_details to verify it's maintained
3. Use check_compatibility with my current dependencies
4. Show a clear recommendation: ✅ Safe to install or ⚠️ Issues found

Format the response as:
- Security status
- Compatibility status
- Recommended install command or alternative

If there are any security issues or incompatibilities, explain them clearly and suggest safe alternatives.`,
                },
              },
            ],
          };

        case 'find_package':
          return {
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `I need a package for: ${args?.useCase}

Please:
1. Use search_packages to find top options
2. For each result (max 3), check:
   - audit_security for vulnerabilities
   - analyze_quality for maintenance/popularity
3. Compare and recommend the best option

Show:
- Package names with brief description
- Security status for each
- Quality scores
- Final recommendation with install command`,
                },
              },
            ],
          };

        case 'audit_project':
          return {
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Audit all dependencies for security issues.

Dependencies: ${args?.dependencies}

Please:
1. Parse the dependencies JSON
2. Run audit_security for each package
3. Summarize findings:
   - ✅ Packages with no issues
   - ⚠️ Packages with vulnerabilities (show severity)
   - 📦 Recommended updates

Provide update commands for any vulnerable packages.`,
                },
              },
            ],
          };

        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    });

    // List available resources (context for AI)
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'npm://guidelines/security-first',
          name: 'NPM Security Guidelines',
          description: 'Automatic security check guidelines for npm packages',
          mimeType: 'text/plain',
        },
        {
          uri: 'npm://guidelines/install-workflow',
          name: 'Package Installation Workflow',
          description: 'Required steps before installing any npm package',
          mimeType: 'text/plain',
        },
        {
          uri: 'npm://watch/package-json',
          name: 'Package.json Watcher',
          description: 'Subscribe to get notified when package.json changes are detected',
          mimeType: 'application/json',
        },
      ],
    }));

    // Read resource content
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;

      switch (uri) {
        case 'npm://guidelines/security-first':
          return {
            contents: [
              {
                uri,
                mimeType: 'text/plain',
                text: `# NPM Security-First Guidelines

## CRITICAL: Before Installing ANY Package

When user mentions installing, adding, or using an npm package, YOU MUST automatically:

1. **Security Check** (MANDATORY)
   - Run audit_security on the package
   - Check for known vulnerabilities
   - Verify safe versions exist

2. **Compatibility Check** (MANDATORY)
   - Run check_compatibility with user's dependencies
   - Look for peer dependency conflicts
   - Verify version compatibility

3. **Quality Assessment** (RECOMMENDED)
   - Check package maintenance status
   - Verify recent updates
   - Consider download stats

## Auto-Trigger Patterns

Automatically run checks when user says:
- "install X" or "add X package"
- "I need X" or "use X library"
- "npm install", "yarn add", "pnpm add"
- Imports/requires new package in code
- Mentions package name in context of adding to project

## SPECIAL: Cursor Agent Autonomous Mode

When Cursor Agent/Composer writes code autonomously:
- If it adds import/require for NEW package → audit first + check capabilities
- If it modifies package.json dependencies → audit all new packages + verify ESM/TS support
- If it suggests npm install command → audit + check capabilities before suggesting
- NEVER write package.json without checking security AND capabilities
- ALWAYS verify ESM/TypeScript support for modern projects

## Automatic Capability Checks

When analyzing or recommending packages, also check:
- ESM vs CommonJS support (modern projects prefer ESM)
- TypeScript definitions (for TS projects)
- Platform support (Node.js, Browser, Deno, Bun)
- Engine requirements (Node version compatibility)

Use analyze_capabilities tool to check these automatically.

## Response Format

Always respond with:
✅ SAFE or ⚠️ WARNING
- Security status
- Compatibility status
- Recommended command

## Example

User: "I need axios for API calls"
You: 
1. audit_security("axios")
2. check_compatibility("axios", project_deps)
3. Response: "✅ axios@1.6.0 is safe. No vulnerabilities. npm install axios@1.6.0"

NEVER suggest installing without checking security first!`,
              },
            ],
          };

        case 'npm://guidelines/install-workflow':
          return {
            contents: [
              {
                uri,
                mimeType: 'text/plain',
                text: `# Package Installation Workflow

## Automatic Detection

When user message contains package-related keywords, automatically execute this workflow:

### Keywords that trigger workflow:
- Package names (express, react, lodash, etc.)
- "install", "add", "use", "need"
- "npm", "yarn", "pnpm"
- "library", "package", "dependency"
- Import/require statements with new packages

### Workflow Steps

1. **Extract Package Name**
   - From user message or code
   - Handle @scoped/packages
   - Handle version specs (package@version)

2. **Run Security Audit**
   \`\`\`
   audit_security(packageName, version?)
   \`\`\`
   - Check for CVEs
   - Get severity levels
   - Find safe versions

3. **Check Compatibility**
   \`\`\`
   check_compatibility(packageName, version, existingDeps)
   \`\`\`
   - Verify peer dependencies
   - Check for conflicts
   - Validate version ranges

4. **Get Package Details**
   \`\`\`
   get_package_details(packageName)
   \`\`\`
   - Check deprecation status
   - Verify maintenance
   - Get latest version

5. **Generate Recommendation**
   - ✅ Safe: Provide install command
   - ⚠️ Issues: Explain problems + suggest fix
   - 🚫 Unsafe: Recommend alternatives

### Example Execution

User: "Let me install lodash for utilities"

Auto-execute:
\`\`\`javascript
// Step 1: Security
const security = await audit_security("lodash");
// Step 2: Compatibility  
const compat = await check_compatibility("lodash", "^4.17.21", projectDeps);
// Step 3: Details
const details = await get_package_details("lodash");
\`\`\`

Response:
"⚠️ lodash@4.17.20 has security issues. Use lodash@4.17.21 instead.
npm install lodash@4.17.21"

### Never Skip

- NEVER suggest npm install without audit_security
- NEVER ignore peer dependency warnings
- NEVER recommend deprecated packages
- ALWAYS provide specific version in command`,
              },
            ],
          };

        case 'npm://watch/package-json':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  message: 'Watching for package.json changes',
                  instructions: [
                    'When Cursor Agent adds dependencies to package.json',
                    'When Cursor Agent writes import/require for new packages',
                    'When user creates/modifies package.json',
                    'Automatically run audit_security for new packages',
                    'Check compatibility with existing dependencies',
                    'Warn about vulnerabilities before completing the task'
                  ],
                  autoTriggers: {
                    onPackageJsonModified: 'audit_all_new_dependencies',
                    onNewImport: 'audit_single_package',
                    onNpmCommand: 'check_security_first'
                  }
                }, null, 2),
              },
            ],
          };

        default:
          throw new Error(`Unknown resource: ${uri}`);
      }
    });

    // Handle subscriptions (for package.json changes)
    this.server.setRequestHandler(SubscribeRequestSchema, async (request) => {
      const { uri } = request.params;
      this.subscriptions.add(uri);

      // Send immediate notification about current state
      if (uri === 'npm://watch/package-json') {
        // Client subscribed to package.json monitoring
        // They'll get notified when package.json changes
      }

      return {};
    });

    // Handle unsubscriptions
    this.server.setRequestHandler(UnsubscribeRequestSchema, async (request) => {
      const { uri } = request.params;
      this.subscriptions.delete(uri);
      return {};
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_packages':
            return await this.handleSearchPackages(args);
          case 'get_package_details':
            return await this.handleGetPackageDetails(args);
          case 'audit_security':
            return await this.handleAuditSecurity(args);
          case 'check_compatibility':
            return await this.handleCheckCompatibility(args);
          case 'analyze_quality':
            return await this.handleAnalyzeQuality(args);
          case 'analyze_npx_command':
            return await this.handleAnalyzeNpxCommand(args);
          case 'compare_versions':
            return await this.handleCompareVersions(args);
          case 'analyze_capabilities':
            return await this.handleAnalyzeCapabilities(args);
          case 'generate_quick_start':
            return await this.handleGenerateQuickStart(args);
          case 'compare_packages':
            return await this.handleComparePackages(args);
          case 'analyze_bundle_size':
            return await this.handleAnalyzeBundleSize(args);
          case 'find_similar_packages':
            return await this.handleFindSimilarPackages(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  // Implemented tool handlers
  private async handleSearchPackages(args: any) {
    const result = await searchPackages(args, this.registryClient);
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }

  private async handleGetPackageDetails(args: any) {
    const result = await getPackageDetails(args, this.registryClient);
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }

  private async handleAuditSecurity(args: any) {
    const result = await auditSecurity(args, this.registryClient);
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }

  private async handleCheckCompatibility(args: any) {
    const result = await checkCompatibility(args, this.registryClient);
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }

  private async handleAnalyzeQuality(args: any) {
    const result = await analyzeQuality(args, this.registryClient);
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }

  private async handleAnalyzeNpxCommand(args: any) {
    const result = await analyzeNpxCommand(args, this.registryClient);
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }

  private async handleCompareVersions(args: any) {
    const result = await compareVersions(args, this.registryClient);
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }

  private async handleAnalyzeCapabilities(args: any) {
    const result = await analyzeCapabilities(args, this.registryClient);
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }

  private async handleGenerateQuickStart(args: any) {
    const result = await generateQuickStart(args, this.registryClient);
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }

  private async handleComparePackages(args: any) {
    const result = await comparePackages(args, this.registryClient);
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }

  private async handleAnalyzeBundleSize(args: any) {
    const result = await analyzeBundleSize(args, this.registryClient);
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }

  private async handleFindSimilarPackages(args: any) {
    const result = await findSimilarPackages(args, this.registryClient);
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('NPM Registry MCP Server running on stdio');
  }
}

// Start server
const server = new NpmRegistryServer();
server.run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

// Export for testing
export { NpmRegistryServer };
