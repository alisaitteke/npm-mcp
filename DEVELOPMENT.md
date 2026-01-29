# Development

Setup, architecture, and tool reference for contributing to @alisaitteke/npm-mcp.

## Setup

```bash
git clone https://github.com/alisaitteke/npm-mcp.git
cd npm-mcp
npm install
npm run build
```

## Scripts

| Command           | Description        |
|-------------------|--------------------|
| `npm run build`   | Build dist/        |
| `npm test`        | Run tests          |
| `npm run test:coverage` | Coverage report |
| `npm run typecheck`    | TypeScript check |
| `npm run dev`     | Watch build        |

## Project structure

```
npm-mcp/
├── src/
│   ├── index.ts              # MCP server entry
│   ├── registry-client.ts    # NPM API client (cache, retry, limit)
│   ├── types.ts              # Shared types
│   └── tools/
│       ├── search-packages.ts
│       ├── package-details.ts
│       ├── security-audit.ts
│       ├── version-compatibility.ts
│       ├── quality-analysis.ts
│       └── npx-command.ts
├── test/                     # Vitest tests
├── bin/npm-registry-mcp.js   # npx entry point
├── server.json               # MCP registry metadata
└── package.json
```

## Architecture

- **Registry client**: Concurrency limit (10), LRU cache (5 min), exponential backoff on 429
- **Tools**: One module per tool, Zod for input validation
- **Stack**: TypeScript, Node 18+ (native fetch), MCP SDK, Vitest, Zod, semver, Octokit

## Tool reference

### search_packages

- **Input**: `query` (string), `limit?` (number, default 10, max 50)
- **Returns**: Ranked list with scores

### get_package_details

- **Input**: `packageName` (string), `version?` (string)
- **Returns**: Versions, dependencies, repo, download stats, size

### audit_security

- **Input**: `packageName`, `version?`
- **Returns**: CVEs, severity, safe version suggestions

### check_compatibility

- **Input**: `packageName`, `version?`, `existingDependencies` (Record<string, string>)
- **Returns**: Peer conflicts, compatible or not, resolution hints

### analyze_quality

- **Input**: `packageName`
- **Returns**: Popularity/maintenance/community scores, GitHub metrics

### compare_versions

- **Input**: `packageName`, `fromVersion`, `toVersion`
- **Returns**: Breaking changes, dependency diff, semver summary

### analyze_npx_command

- **Input**: `command` (e.g. `create-react-app` or `typescript@5.0.0`), `args?`, `timeout?`
- **Returns**: Package validation, warnings, suggested safe command (does not execute)

## Caching & limits

- Package metadata, download stats, GitHub: 5 min TTL
- Max 10 concurrent requests; backoff on 429
- Cache clear: `client.clearCache()` (internal)

## Troubleshooting

**Server won’t start**

- Node 18+: `node --version`
- Rebuild: `npm run build`
- Bin executable: `chmod +x bin/npm-registry-mcp.js`

**GitHub rate limits**

- Quality analysis uses GitHub API; unauthenticated limit 60 req/h. Some packages may fail.

**Tests fail**

```bash
rm -rf node_modules package-lock.json
npm install
npm run build
npm test
```

## Adding a new tool

1. Add `src/tools/<name>.ts` with Zod schema and handler.
2. In `src/index.ts`: list tool in `ListToolsRequestSchema`, call handler in `CallToolRequestSchema`.
3. Add tests in `test/<name>.test.ts`.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for workflow and PR process.
