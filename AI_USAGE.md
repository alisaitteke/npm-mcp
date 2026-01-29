# AI Usage Guide

This guide helps AI assistants (Cursor, Claude) automatically use npm-registry-mcp tools when working with npm packages.

## For Users: Enable Auto-Trigger

To make AI automatically check packages, add this to your project's `.cursorrules`:

```markdown
# NPM Package Management Rules

When working with npm packages, ALWAYS use npm-registry-mcp tools:

## Auto-trigger on:
- "npm install X" or "add package X" → check security + compatibility first
- "which package for Y?" → search + compare options
- "npx something" → analyze command safety
- User mentions package names → audit in background
- package.json changes → security scan

## Required checks before install:
1. audit_security - Check vulnerabilities
2. check_compatibility - Verify with existing deps
3. If issues: warn + suggest safe version

## Example:
User: "install express"
AI: 
1. audit_security("express")
2. check_compatibility("express", package.json deps)
3. If safe: "npm install express@4.18.2" 
4. If unsafe: warn + suggest alternative
```

## For AI Assistants: Behavior Instructions

### Auto-trigger MCP tools when:

| User Input | Tool to Use | Action |
|------------|-------------|--------|
| "install X", "add X" | `audit_security` + `check_compatibility` | Check before recommending install |
| "which package", "best library" | `search_packages` | Find and compare options |
| "npx create-..." | `analyze_npx_command` | Validate before execution |
| Mentions package name | `get_package_details` | Show info proactively |
| "update X", "upgrade X" | `compare_versions` + `audit_security` | Show changes and security |
| Pastes package.json | `audit_security` (all deps) | Security report |

### Response Template:

```
✅ express@4.18.2 is safe to install

Security: No vulnerabilities
Compatibility: ✅ Compatible with your dependencies
Quality: 95/100 (11M weekly downloads)

Install:
npm install express@4.18.2
```

### Warning Template:

```
⚠️ SECURITY WARNING: lodash@4.17.20 has 2 vulnerabilities

Severity: High
Issue: Prototype pollution
Safe version: lodash@4.17.21

Recommended:
npm install lodash@4.17.21
```

## For Cursor Users: Global Rules

Add to `~/.cursor/.cursorrules` (global):

```markdown
# Global NPM Safety Rules

For ANY project with package.json:
- Before suggesting npm install: use npm-registry-mcp audit_security
- On package.json edit: scan new dependencies
- On npx mention: use npm-registry-mcp analyze_npx_command
- Auto-suggest updates for vulnerable packages
```

## For Claude Desktop Users

Claude will automatically use MCP tools when:
- You ask about packages
- You paste package.json
- You mention npm/yarn/pnpm commands
- You import/require packages in code

No additional config needed beyond MCP setup.

## Workflow Examples

### Example 1: User asks "I need a date library"
```
AI automatically:
1. search_packages("date library javascript")
2. Get top 3: date-fns, dayjs, luxon
3. For each: audit_security + analyze_quality
4. Present comparison
5. Recommend safest + best maintained
```

### Example 2: User says "npm install axios"
```
AI automatically:
1. get_package_details("axios")
2. audit_security("axios", "latest")
3. check_compatibility("axios", "latest", currentDeps)
4. Show result:
   - If safe: confirm install command
   - If vulnerable: suggest safe version
   - If incompatible: warn about conflicts
```

### Example 3: User pastes package.json
```
AI automatically:
1. Extract dependencies
2. audit_security for all (parallel)
3. Show vulnerabilities table
4. Suggest update commands for unsafe packages
```

## Best Practices

1. **Always check security first** - Never recommend install without audit
2. **Be proactive** - Don't wait for user to ask "is it safe?"
3. **Batch operations** - Check multiple packages in parallel
4. **Clear warnings** - Use ⚠️ 🔒 ✅ emojis for visibility
5. **Actionable output** - Always provide safe install command
6. **Suggest alternatives** - If package has issues, recommend safer options

---

**TL;DR**: AI assistants using this MCP should automatically check security and compatibility for ANY npm package mentioned, without waiting for explicit user request.
