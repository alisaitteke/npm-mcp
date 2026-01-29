import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
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

/**
 * NPM Registry MCP Server
 * Provides tools for npm package search, analysis, security auditing, and compatibility checking
 */
class NpmRegistryServer {
  private server: Server;
  private registryClient: RegistryClient;

  constructor() {
    this.server = new Server(
      {
        name: 'npm-registry-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
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
      ],
    }));

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
