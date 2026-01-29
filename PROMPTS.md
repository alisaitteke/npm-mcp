# MCP Prompts (Slash Commands)

This MCP includes smart prompts that AI can use as shortcuts for common workflows.

## Available Prompts

### `/check_before_install`

Full security and compatibility check before installing a package.

**Usage in Cursor:**
```
/check_before_install express
```

**What it does:**
1. Runs `audit_security` for vulnerabilities
2. Gets `package_details` to verify maintenance
3. Checks `compatibility` with your dependencies
4. Shows clear ✅/⚠️ recommendation

**Response format:**
```
✅ express@4.18.2 is safe to install

Security: No known vulnerabilities
Compatibility: ✅ No peer dependency conflicts
Maintenance: Active (last update: 2 days ago)

Install: npm install express@4.18.2
```

---

### `/find_package`

Find and compare packages for a specific use case.

**Usage:**
```
/find_package state management
/find_package date library
/find_package testing framework
```

**What it does:**
1. Searches npm registry
2. Gets top 3 results
3. Checks security + quality for each
4. Recommends best option

**Response format:**
```
Top options for "state management":

1. ✅ zustand (recommended)
   - Security: No vulnerabilities
   - Quality: 98/100
   - Downloads: 2M/week
   
2. ✅ redux
   - Security: No vulnerabilities
   - Quality: 95/100
   - Downloads: 8M/week

3. ⚠️ mobx
   - Security: 1 low severity issue
   - Quality: 92/100

Recommendation: zustand
Install: npm install zustand@4.5.0
```

---

### `/audit_project`

Security audit for all dependencies in your project.

**Usage:**
```
/audit_project
```

**What it does:**
1. Reads your package.json dependencies
2. Runs security audit on each package
3. Summarizes vulnerable packages
4. Provides update commands

**Response format:**
```
📊 Security Audit Results

✅ Safe packages (23):
- react@18.2.0
- axios@1.6.0
...

⚠️ Vulnerable packages (2):

1. lodash@4.17.20 (HIGH)
   - Issue: Prototype pollution
   - Fix: npm install lodash@4.17.21
   
2. express@4.17.1 (MODERATE)
   - Issue: Open redirect
   - Fix: npm install express@4.18.2

Total: 25 packages, 2 need updates
```

---

## How to Use Prompts

### In Cursor

1. Type `/` in chat
2. Select prompt from menu
3. Add arguments if needed
4. AI executes automatically

### In Claude Desktop

Just mention the prompt naturally:
```
"Can you check if express is safe to install?"
→ AI uses check_before_install prompt

"Find me a good date library"
→ AI uses find_package prompt
```

## Creating Custom Workflows

You can combine prompts with your own instructions:

```
/check_before_install axios
Also compare it with node-fetch
```

```
/audit_project
Then suggest which packages to update first based on severity
```

## Benefits

- **Faster**: One command instead of multiple tool calls
- **Consistent**: Standardized checks every time
- **Guided**: AI knows exactly what to check
- **Safe**: Always includes security verification

---

See [AI_USAGE.md](./AI_USAGE.md) for automatic triggers and [DEVELOPMENT.md](./DEVELOPMENT.md) for adding custom prompts.
