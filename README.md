# NPM MCP

MCP server for npm: search packages, check security, compare versions, and validate compatibility. Use it from Cursor AI or Claude Desktop.

## Features

- **Search** — Find packages with ranking and scores
- **Details** — Versions, dependencies, download stats
- **Security** — Vulnerability check and safe version tips
- **Compatibility** — Peer dependency and version conflicts
- **Quality** — Maintenance and community metrics
- **Version compare** — Breaking changes and semver
- **NPX check** — Validate npx commands before running

## Install & use

### With npx (recommended)

No global install. Add to Cursor or Claude config:

**Cursor** — `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "npm-registry-mcp": {
      "command": "npx",
      "args": ["@alisaitteke/npm-mcp"]
    }
  }
}
```

**Claude Desktop** — `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "npm-registry-mcp": {
      "command": "npx",
      "args": ["@alisaitteke/npm-mcp"]
    }
  }
}
```

### Global install (optional)

```bash
npm install -g @alisaitteke/npm-mcp
```

Then use `"command": "npm-mcp"` (no `args`) in the config above.

## What you can ask

Once the server is connected, you can ask things like:

- “Search for React state management libraries”
- “Security audit for express@4.18”
- “Is lodash@4.17 compatible with my current deps?”
- “Compare React 17 and 18”
- “Quality check for date-fns”
- “Is it safe to run npx create-next-app?”

## Links

- **Development** (setup, tests, architecture): [DEVELOPMENT.md](./DEVELOPMENT.md)
- **Contributing**: [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

MIT

## Contributors

Thanks to everyone who helps improve this project.

[![Contributors](https://img.shields.io/github/contributors/alisaitteke/npm-mcp?style=flat-square)](https://github.com/alisaitteke/npm-mcp/graphs/contributors)
