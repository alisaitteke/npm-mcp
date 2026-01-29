# Contributing to NPM Registry MCP Server

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Development Setup

1. **Fork and Clone**
```bash
git clone https://github.com/alisaitteke/npm-mcp.git
cd npm-mcp
```

2. **Install Dependencies**
```bash
npm install
```

3. **Build**
```bash
npm run build
```

4. **Run Tests**
```bash
npm test
```

## Development Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `test/` - Test additions or fixes
- `refactor/` - Code refactoring

### Commit Messages

Follow conventional commits:

```
feat: add new search filter
fix: resolve caching issue
docs: update README examples
test: add coverage for quality analysis
refactor: simplify version comparison logic
```

### Code Style

- Use TypeScript with strict mode
- Follow existing code patterns
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Use descriptive variable names

### Testing

- Write tests for all new features
- Maintain or improve code coverage
- Test both success and error cases
- Use descriptive test names

```typescript
it('should handle invalid package names gracefully', async () => {
  // Test implementation
});
```

### Pull Request Process

1. **Create a Feature Branch**
```bash
git checkout -b feature/my-new-feature
```

2. **Make Your Changes**
- Write code
- Add tests
- Update documentation

3. **Run Tests**
```bash
npm test
npm run test:coverage
npm run typecheck
```

4. **Commit and Push**
```bash
git add .
git commit -m "feat: add my new feature"
git push origin feature/my-new-feature
```

5. **Open Pull Request**
- Provide clear description
- Link related issues
- Ensure CI passes

## Project Structure

```
src/
├── index.ts                 # Main server entry point
├── registry-client.ts       # NPM API client
├── types.ts                 # TypeScript type definitions
└── tools/                   # MCP tool implementations
    ├── search-packages.ts
    ├── package-details.ts
    ├── security-audit.ts
    ├── version-compatibility.ts
    ├── quality-analysis.ts
    └── npx-command.ts
```

## Adding New Tools

1. **Create Tool File**
```typescript
// src/tools/my-tool.ts
import { z } from 'zod';
import { RegistryClient } from '../registry-client.js';

export const MyToolSchema = z.object({
  param: z.string(),
});

export async function myTool(
  params: z.infer<typeof MyToolSchema>,
  client: RegistryClient
): Promise<string> {
  const validated = MyToolSchema.parse(params);
  // Implementation
  return JSON.stringify({ success: true });
}
```

2. **Register in Server**
```typescript
// src/index.ts
import { myTool } from './tools/my-tool.js';

// Add to tools list in ListToolsRequestSchema handler
// Add to CallToolRequestSchema handler
```

3. **Add Tests**
```typescript
// test/my-tool.test.ts
describe('My Tool', () => {
  it('should work correctly', async () => {
    // Test implementation
  });
});
```

## Code Review Guidelines

### For Contributors

- Keep PRs focused and small
- Respond to feedback promptly
- Update based on review comments

### For Reviewers

- Be constructive and respectful
- Focus on code quality and maintainability
- Suggest improvements, don't demand perfection
- Approve when code meets standards

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag
4. Publish to npm

## Questions?

- Open an issue for bugs
- Start a discussion for questions
- Reach out to maintainers

Thank you for contributing!
