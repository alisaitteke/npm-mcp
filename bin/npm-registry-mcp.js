#!/usr/bin/env node

// NPX entry point for npm-registry-mcp
// Imports the compiled server from dist/
import('../dist/index.js').catch((error) => {
  console.error('Failed to start NPM Registry MCP Server:', error);
  process.exit(1);
});
