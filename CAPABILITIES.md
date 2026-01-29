# Package Capabilities Analysis

The `analyze_capabilities` tool provides comprehensive analysis of package capabilities, including module systems, TypeScript support, platform compatibility, and more.

## What It Analyzes

### 1. **Module System**
- **ESM** (ES Modules): `import/export` syntax
- **CommonJS**: `require/module.exports`
- **UMD**: Universal Module Definition
- **Dual Package**: Supports both ESM and CommonJS

**Example output:**
```json
{
  "esm": true,
  "commonjs": true,
  "dualPackage": true,
  "details": [
    "Package type: 'module' (native ESM)",
    "Dual package: ESM + CommonJS support"
  ]
}
```

### 2. **TypeScript Support**
- Built-in type definitions
- Separate `@types/` package needed
- Written in TypeScript
- Location of `.d.ts` files

**Example output:**
```json
{
  "hasTypes": true,
  "typesLocation": "./dist/index.d.ts",
  "isTypeScriptPackage": true,
  "details": [
    "Type definitions: ./dist/index.d.ts",
    "Built with TypeScript"
  ]
}
```

### 3. **Platform Support**
- **Node.js**: Server-side JavaScript
- **Browser**: Client-side JavaScript
- **Deno**: Modern TypeScript runtime
- **Bun**: Fast all-in-one JavaScript runtime
- **React**: React component/library
- **React Native**: Mobile development

**Example output:**
```json
{
  "node": true,
  "browser": true,
  "deno": false,
  "details": [
    "Node.js: >=18.0.0",
    "Browser support in exports"
  ]
}
```

### 4. **Package Exports**
- Conditional exports (`import`/`require`/`types`)
- Subpath exports (`./utils`, `./components`)
- Modern package structure

**Example output:**
```json
{
  "hasExports": true,
  "conditionalExports": true,
  "subpathExports": true,
  "details": [
    "Conditional exports (import/require/types)",
    "Subpaths: ./client, ./server, ./utils"
  ]
}
```

### 5. **Build Tools**
Detects build tools used:
- Webpack, Rollup, Vite, esbuild
- TypeScript compiler
- Babel, SWC
- tsup

### 6. **Engine Requirements**
- Node.js version required
- npm/yarn/pnpm versions
- Other runtime requirements

## Usage

### Basic Analysis

```typescript
// Tool call
analyze_capabilities({
  packageName: "vite"
})

// Response
{
  "success": true,
  "package": {
    "name": "vite",
    "version": "5.0.0"
  },
  "moduleSystem": {
    "esm": true,
    "commonjs": true,
    "dualPackage": true
  },
  "typescript": {
    "hasTypes": true,
    "typesLocation": "./dist/node/index.d.ts"
  },
  "platform": {
    "node": true,
    "browser": false
  },
  "summary": "✅ Dual Package: ESM + CommonJS\n✅ TypeScript definitions included\n✅ Platforms: Node.js\n✅ Modern package (uses exports field)"
}
```

### Specific Version

```typescript
analyze_capabilities({
  packageName: "express",
  version: "4.18.2"
})
```

## Use Cases

### 1. **Modern Project Setup**

Before adding a package to an ESM + TypeScript project:

```
User: "I need an HTTP client for my TypeScript ESM project"

AI automatically:
1. search_packages("http client node")
2. For top results:
   - analyze_capabilities("axios")
   - analyze_capabilities("node-fetch")
   - analyze_capabilities("undici")
3. Filters by:
   - ESM support ✅
   - TypeScript types ✅
4. Recommends: undici (native ESM + TS)
```

### 2. **Migration Analysis**

When migrating from CommonJS to ESM:

```
analyze_capabilities("lodash")

Result:
{
  "moduleSystem": {
    "esm": false,
    "commonjs": true
  }
}

AI suggests: "lodash-es" (ESM version) or tree-shakeable alternative
```

### 3. **Cross-Platform Compatibility**

Building for both Node.js and Browser:

```
analyze_capabilities("date-fns")

Result:
{
  "platform": {
    "node": true,
    "browser": true
  }
}

✅ Works in both environments
```

### 4. **Automatic in Cursor Agent**

When Cursor Agent generates code:

```
User: "Build a TypeScript ESM API"

Cursor Agent:
1. About to add express
2. analyze_capabilities("express")
3. Finds: CommonJS-only, no native ESM
4. Switches to: fastify (ESM + TS)
5. Generates modern code with ESM imports
```

## Integration with Other Tools

### With `search_packages`

```javascript
// After finding packages
search_packages("state management")
  .then(results => {
    // Check capabilities for each
    results.forEach(pkg => 
      analyze_capabilities(pkg.name)
    );
  });
```

### With `check_before_install`

```javascript
// Comprehensive check
1. audit_security("package")       // Security
2. check_compatibility("package")  // Compatibility
3. analyze_capabilities("package") // Capabilities
4. Decision: ✅ Safe + Modern or ⚠️ Issues
```

### With `audit_project`

```javascript
// Audit all dependencies
{
  "dependencies": {
    "express": "4.18.2",   // Check capabilities
    "axios": "1.6.0",      // Check capabilities
    "lodash": "4.17.21"    // Check capabilities
  }
}

// Report:
- express: ⚠️ CommonJS-only (consider fastify)
- axios: ✅ Dual package + Types
- lodash: ⚠️ Large + No ESM (use lodash-es)
```

## Example Outputs

### Modern Dual Package (Vite)

```json
{
  "moduleSystem": {
    "esm": true,
    "commonjs": true,
    "dualPackage": true,
    "details": [
      "Package type: 'module' (native ESM)",
      "Dual package: ESM + CommonJS support"
    ]
  },
  "typescript": {
    "hasTypes": true,
    "typesLocation": "./dist/node/index.d.ts",
    "isTypeScriptPackage": true
  },
  "exports": {
    "hasExports": true,
    "conditionalExports": true
  },
  "summary": "✅ Dual Package: ESM + CommonJS\n✅ TypeScript definitions included\n✅ Modern package"
}
```

### Legacy CommonJS (Express)

```json
{
  "moduleSystem": {
    "esm": false,
    "commonjs": true,
    "dualPackage": false,
    "details": [
      "Main file: index.js (likely CommonJS)"
    ]
  },
  "typescript": {
    "hasTypes": false,
    "details": [
      "May need @types/express for TypeScript support"
    ]
  },
  "summary": "✅ CommonJS\n⚠️ No TypeScript definitions (may need @types package)"
}
```

### Browser + Node (Axios)

```json
{
  "platform": {
    "node": true,
    "browser": true
  },
  "moduleSystem": {
    "dualPackage": true
  },
  "summary": "✅ Dual Package: ESM + CommonJS\n✅ Platforms: Node.js, Browser"
}
```

## Tips

### For Modern Projects

Look for:
- ✅ `dualPackage: true` or `esm: true`
- ✅ `hasTypes: true`
- ✅ `exports.hasExports: true`
- ✅ Recent `engines.node` version

### Red Flags

Watch out for:
- ⚠️ No ESM support (CommonJS-only)
- ⚠️ No TypeScript types
- ⚠️ Old Node.js engine requirement
- ⚠️ No exports field (legacy structure)

### Alternatives

If package lacks modern features:
- CommonJS-only → Find ESM alternative
- No types → Check for `@types/` package
- Old package → Look for actively maintained fork

---

This tool helps ensure your project uses modern, well-maintained packages with the right capabilities for your stack! 🎯
