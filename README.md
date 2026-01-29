<div align="center">

![NPM MCP Banner](./social_preview.png)

# NPM MCP

**Model Context Protocol server for npm registry**

Search packages, check security, compare versions, and validate compatibility. Use it from Cursor AI or Claude Desktop.

> **Note:** This is an unofficial, community-driven MCP server and is not affiliated with or endorsed by npm, Inc.

</div>

## Features

- **Auto-Security** — AI automatically checks packages before suggesting install (no user action!)
- **Capabilities Analysis** — ESM/CJS, TypeScript, Platform support (Node/Browser/Deno), Build tools
- **Quick Start Generator** — Ready-to-use code examples for any package
- **Package Comparison** — Compare alternatives side-by-side (features, size, popularity)
- **Bundle Size Analysis** — Minified/gzipped sizes, tree-shaking, impact on your bundle
- **Similar Packages** — Find alternatives and similar packages
- **Search** — Find packages with ranking and scores
- **Details** — Versions, dependencies, download stats, deprecation status
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

## Files included for users

- **`AI_USAGE.md`** — Instructions for making AI automatically use MCP tools (copy rules to your project)

## License

MIT

## Contributors

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/alisaitteke">
        <img src="https://github.com/alisaitteke.png" width="100px;" alt="Ali Sait Teke"/>
        <br />
        <sub><b>Ali Sait Teke</b></sub>
      </a>
      <br />
      <sub>Creator & Maintainer</sub>
    </td>
  </tr>
</table>

Thanks to everyone who helps improve this project!

[![Contributors](https://img.shields.io/github/contributors/alisaitteke/npm-mcp?style=flat-square)](https://github.com/alisaitteke/npm-mcp/graphs/contributors)
