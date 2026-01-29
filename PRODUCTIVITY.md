# Developer Productivity Tools

New tools to supercharge your development workflow when working with npm packages.

## 🚀 Quick Start Generator (`generate_quick_start`)

Get ready-to-use code examples for any package. No more reading docs to find the basic usage!

### What It Provides

- **Install commands** (npm, yarn, pnpm, bun)
- **Basic usage** with imports/requires
- **Framework-specific examples** (React, Vue, Express, etc.)
- **TypeScript tips** (type definitions, configuration)
- **Helpful warnings** (peer dependencies, engine requirements)

### Usage

```typescript
generate_quick_start({
  packageName: "axios",
  framework: "auto" // or specific: "react", "express", etc.
})
```

### Example Output

```json
{
  "package": { "name": "axios", "version": "1.6.0" },
  "install": {
    "npm": "npm install axios@1.6.0",
    "yarn": "yarn add axios@1.6.0"
  },
  "examples": {
    "basic": {
      "language": "typescript",
      "code": "import axios from 'axios';\n\nconst response = await axios.get('https://api.example.com/data');\nconsole.log(response.data);"
    }
  },
  "tips": [
    "✅ TypeScript types included",
    "✅ Supports ESM (import/export)",
    "📦 Requires Node.js: >=14.0.0"
  ]
}
```

### Real-World Scenario

```
User: "Show me how to use zod"

AI (automatically):
1. generate_quick_start("zod")
2. Gets example code
3. Responds:

"Here's how to use zod:

Install:
npm install zod

Basic usage:
```typescript
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().positive(),
});

const user = UserSchema.parse({
  name: 'John',
  email: 'john@example.com',
  age: 30,
});
```

✅ TypeScript types included"
```

---

## ⚖️ Package Comparison (`compare_packages`)

Compare 2-5 packages side-by-side. Perfect for "X vs Y" questions!

### What It Compares

- **Module System** (ESM, CJS, Dual)
- **TypeScript** support
- **Platform** support (Node, Browser)
- **Popularity** (weekly downloads)
- **Maintenance** (last update, status)
- **Bundle size**
- **Overall score** + recommendation

### Usage

```typescript
compare_packages({
  packages: ["axios", "node-fetch", "undici"]
})
```

### Example Output

```json
{
  "comparison": {
    "moduleSystem": {
      "axios": { "summary": "Dual (ESM + CJS)" },
      "node-fetch": { "summary": "ESM only" },
      "undici": { "summary": "Dual (ESM + CJS)" }
    },
    "typescript": {
      "axios": { "hasTypes": true },
      "node-fetch": { "hasTypes": true },
      "undici": { "hasTypes": true }
    },
    "popularity": {
      "axios": { "weeklyDownloads": "45M", "relative": "Very popular" },
      "node-fetch": { "weeklyDownloads": "32M", "relative": "Very popular" },
      "undici": { "weeklyDownloads": "8M", "relative": "Popular" }
    }
  },
  "recommendation": {
    "winner": "undici",
    "summary": "undici scores highest with Modern ESM support, Recently updated, Small size"
  }
}
```

### Real-World Scenario

```
User: "Which HTTP client should I use: axios or node-fetch?"

AI (automatically):
1. compare_packages(["axios", "node-fetch", "undici"])
2. Analyzes all three
3. Responds:

"Comparison:

**axios**
- ✅ Dual package (ESM + CJS)
- ✅ TypeScript support
- ✅ 45M weekly downloads
- ⚠️ Last updated: 45 days ago
- Size: 120 KB

**node-fetch**
- ✅ ESM only
- ✅ TypeScript support
- ✅ 32M weekly downloads
- ⚠️ Last updated: 180 days ago
- Size: 50 KB

**undici** (Node.js native)
- ✅ Dual package
- ✅ TypeScript support
- ✅ 8M weekly downloads
- ✅ Recently updated (5 days)
- ✅ Size: 85 KB

**Recommendation:** undici - Modern, actively maintained, and will be Node.js's future built-in fetch"
```

---

## 📦 Bundle Size Analysis (`analyze_bundle_size`)

Understand the real impact on your bundle. Uses Bundlephobia API for accurate data.

### What It Analyzes

- **Unpacked size** (on disk)
- **Minified size** (production)
- **Gzipped size** (actual network transfer)
- **Tree-shaking** support
- **Dependencies** count
- **Impact rating** (Excellent/Good/Medium/Large)

### Usage

```typescript
analyze_bundle_size({
  packageName: "lodash"
})
```

### Example Output

```json
{
  "sizes": {
    "unpacked": "1.41 MB",
    "minified": "531.48 KB",
    "gzip": "94.17 KB"
  },
  "impact": {
    "level": "Moderate",
    "rating": "⚠️ Medium",
    "description": "This package will add approximately 94.17 KB to your bundle (gzipped)"
  },
  "treeshaking": {
    "supported": false,
    "description": "❌ CommonJS - no tree-shaking"
  },
  "recommendations": [
    "⚠️ Large bundle size - consider alternatives or code splitting",
    "💡 Package uses CommonJS - look for ESM version for better tree-shaking",
    "💡 Consider lighter alternatives or lodash-style per-method imports"
  ]
}
```

### Real-World Scenario

```
User: "Should I add moment.js?"

AI (automatically):
1. analyze_bundle_size("moment")
2. Sees: 232 KB gzipped!
3. find_similar_packages("moment")
4. Finds: date-fns, dayjs
5. compare_packages(["moment", "date-fns", "dayjs"])
6. Responds:

"⚠️ moment.js will add 232 KB (gzipped) to your bundle - that's quite large!

**Lighter alternatives:**
- **dayjs** (7 KB) - 97% smaller, similar API
- **date-fns** (17 KB) - 93% smaller, tree-shakeable

Recommendation: Use dayjs for smallest size, or date-fns for best functionality"
```

---

## 🔍 Similar Packages Finder (`find_similar_packages`)

Discover alternatives and similar packages. Great for finding modern replacements!

### What It Does

- Searches by **keywords**
- Analyzes **description** similarity
- Ranks by **popularity** + **quality**
- Filters out the **original** package

### Usage

```typescript
find_similar_packages({
  packageName: "express",
  limit: 5
})
```

### Example Output

```json
{
  "original": {
    "name": "express",
    "keywords": ["framework", "web", "http", "server"]
  },
  "similar": [
    {
      "name": "fastify",
      "description": "Fast and low overhead web framework",
      "score": 95,
      "downloads": 2500000,
      "similarity": "Alternative"
    },
    {
      "name": "koa",
      "description": "Expressive middleware for node.js",
      "score": 88,
      "downloads": 1200000,
      "similarity": "Alternative"
    }
  ]
}
```

### Real-World Scenario

```
User: "Is there something better than request?"

AI (automatically):
1. find_similar_packages("request")
2. Finds: axios, node-fetch, got, undici
3. audit_security for each
4. Responds:

"request is deprecated! Here are modern alternatives:

1. **axios** - Most popular (45M/week)
   - ✅ Browser + Node.js
   - ✅ Interceptors, transforms
   
2. **got** - Feature-rich (8M/week)
   - ✅ Retry, cache, hooks
   - ✅ Modern API
   
3. **undici** - Fastest (8M/week)
   - ✅ Node.js official
   - ✅ HTTP/1.1 keep-alive

Recommendation: axios for versatility, undici for performance"
```

---

## 🎯 Combined Workflows

These tools work together automatically!

### Workflow 1: "Add Package X"

```
User: "Add lodash"

AI automatically:
1. audit_security("lodash")          → Security check
2. check_compatibility("lodash")     → Peer deps
3. analyze_capabilities("lodash")    → ESM/TS support
4. analyze_bundle_size("lodash")     → Size impact!
5. find_similar_packages("lodash")   → Alternatives?

AI Response:
"⚠️ lodash is 94 KB gzipped - quite large!

**Lighter alternatives:**
- lodash-es (tree-shakeable)
- ramda (functional)
- radash (modern, 15 KB)

Or import only what you need:
npm install lodash.chunk lodash.debounce

Choose based on your needs!"
```

### Workflow 2: "Best Package for X"

```
User: "Best date library?"

AI automatically:
1. search_packages("date library")
2. compare_packages(top 3 results)
3. analyze_bundle_size(each)
4. generate_quick_start(winner)

AI Response:
"Compared date libraries:

**dayjs** - Winner! ✅
- 7 KB (vs moment: 232 KB)
- Similar API to moment
- Immutable

**date-fns**
- 17 KB
- Tree-shakeable
- Functional

Quick start (dayjs):
```typescript
import dayjs from 'dayjs';

const date = dayjs('2024-01-15');
console.log(date.format('YYYY-MM-DD'));
```

Install: npm install dayjs"
```

### Workflow 3: Cursor Agent Autonomous

```
User: "Build API with validation"

Cursor Agent:
1. Needs web framework
2. compare_packages(["express", "fastify", "hono"])
3. analyze_bundle_size(each)
4. Picks fastify (fast + modern)
5. Needs validation
6. compare_packages(["zod", "yup", "joi"])
7. analyze_capabilities(each) → zod has best TS
8. generate_quick_start("zod") → Gets example code
9. Generates complete API with best packages!

Result: Modern, type-safe API with optimal packages
```

---

## Benefits

| Feature | Before | After |
|---------|--------|-------|
| **Find usage** | Read docs | `generate_quick_start` → instant code |
| **Compare** | Manual research | `compare_packages` → side-by-side |
| **Bundle impact** | Surprise at build | `analyze_bundle_size` → know upfront |
| **Find alternatives** | Google search | `find_similar_packages` → ranked list |
| **Best choice** | Guesswork | Combined analysis → data-driven |

## Summary

**Developer productivity tools save time:**
- ⚡ No more doc reading for basic usage
- ⚡ Quick comparisons when choosing packages
- ⚡ Bundle size awareness before adding
- ⚡ Easy discovery of better alternatives
- ⚡ All integrated with security + compatibility checks

**AI uses these automatically** — you just ask naturally, and get comprehensive, informed recommendations! 🚀
