# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-29

### Added
- Initial release of NPM Registry MCP Server
- Package search tool with popularity ranking
- Package details tool with comprehensive metadata
- Security audit tool with CVE detection
- Compatibility checker for peer dependencies
- Quality analysis with GitHub metrics
- Version comparison with breaking changes detection
- NPX command analysis for safe execution
- Rate limiting with 10 concurrent requests
- LRU caching with 5-minute TTL
- Exponential backoff retry logic
- Full TypeScript support with strict mode
- Comprehensive test suite (54 tests)
- Zod validation for all inputs
- Support for Cursor AI and Claude Desktop

### Technical Details
- Built with @modelcontextprotocol/sdk 1.25+
- Uses Node.js native fetch (18+)
- Implements stdio transport for MCP
- Zero dependencies for runtime (except MCP SDK)
- ESM module format

### Documentation
- Complete README with examples
- API documentation for all tools
- Integration guides for Cursor and Claude
- Troubleshooting section
