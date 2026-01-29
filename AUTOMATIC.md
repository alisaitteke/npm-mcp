# Automatic NPM Security Checks

This MCP automatically injects security guidelines into AI context, making checks happen without explicit commands.

## How It Works

### 1. **MCP Resources** (Auto-Context)

When this MCP connects, it automatically provides these resources to AI:

- **`npm://guidelines/security-first`** — Security-first rules
- **`npm://guidelines/install-workflow`** — Auto-check workflow

AI reads these **automatically** and follows the guidelines.

### 2. **Trigger Patterns**

AI automatically runs security checks when it detects:

```
User: "install express"
User: "I need axios for API"
User: "add lodash to project"
User: "use react-query"
User: "npm install typescript"
```

**Any mention of:**
- Package names (express, react, lodash...)
- Keywords: install, add, use, need, require
- Commands: npm install, yarn add, pnpm add
- Code: import/require with new packages

### 3. **Auto-Execution Flow**

```
User prompt: "nodejs ile örnek bir api isteği hazırla"

AI detects: "API request" → needs a package (axios, node-fetch, etc.)

AI automatically:
1. search_packages("http client node")
2. audit_security("axios")  ← Automatic!
3. check_compatibility("axios", project_deps)
4. Response with safe version

"For API requests, I recommend axios.
✅ No vulnerabilities
✅ Compatible with your project
npm install axios@1.6.0"
```

### 4. **No User Action Needed**

User doesn't type:
- ❌ "Check if axios is safe"
- ❌ "/check_before_install axios"
- ❌ "Audit security first"

AI just **automatically** checks because:
- MCP resources provide the guidelines
- AI follows them for every package mention
- Happens in background, transparent to user

## Example Scenarios

### Scenario 1: New Project Setup

```
User: "nodejs ile REST API projesi kur"

AI (automatically):
1. Suggests express
2. audit_security("express") ← Auto
3. check_compatibility("express", {}) ← Auto
4. Response: "✅ express@4.18.2 is safe"
5. Provides setup code with safe version
```

### Scenario 2: Adding Feature

```
User: "JWT authentication ekle"

AI (automatically):
1. search_packages("jwt node")
2. Compares: jsonwebtoken vs jose
3. audit_security for both ← Auto
4. analyze_quality for both ← Auto
5. Recommends safer option
```

### Scenario 3: Code Generation

```
User: "date formatting için kod yaz"

AI (automatically):
1. Knows it needs date library
2. search_packages("date library")
3. audit_security("date-fns") ← Auto
4. audit_security("dayjs") ← Auto
5. Recommends safest + provides code
```

## Why This Works

### Traditional Approach (Manual)
```
User: "I want axios"
AI: "Sure, run: npm install axios"
❌ No security check
❌ No compatibility check
❌ Risk of vulnerabilities
```

### With MCP Resources (Automatic)
```
User: "I want axios"
AI reads resource: "MUST check security first"
AI: Runs audit_security("axios") automatically
AI: "✅ axios@1.6.0 is safe. npm install axios@1.6.0"
✅ Automatic security
✅ Safe version ensured
✅ Zero user effort
```

## Configuration

### For AI Platform (Cursor/Claude)

MCP resources are **passive** — they load automatically when MCP connects. No additional setup needed beyond:

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

### For Developers

Just use natural language. AI handles the rest:

```
✅ "install package X"
✅ "I need library Y"
✅ "add dependency Z"
✅ "use framework W"
```

AI automatically:
1. Detects package intent
2. Runs security audit
3. Checks compatibility
4. Provides safe command

## Technical Details

### MCP Resource Format

```typescript
{
  uri: 'npm://guidelines/security-first',
  name: 'NPM Security Guidelines',
  description: 'Automatic security check guidelines',
  mimeType: 'text/plain'
}
```

### Resource Content

Contains instructions like:

```markdown
When user mentions installing package:
1. Run audit_security(packageName)
2. Run check_compatibility(packageName, deps)
3. Only then suggest install command

NEVER suggest npm install without audit_security!
```

AI reads this once at startup and follows it for every interaction.

### Advantages Over Prompts

| Feature | Prompts (/slash) | Resources (Auto) |
|---------|------------------|------------------|
| User action | Manual trigger | Automatic |
| Consistency | User must remember | Always applied |
| Coverage | Only when invoked | Every package mention |
| UX | Extra command | Transparent |

## Best Practices

### For AI (Already Implemented)

✅ Read resources at startup
✅ Follow guidelines for every package
✅ Check security before suggesting install
✅ Show clear ✅/⚠️ status

### For Users

✅ Just ask naturally
✅ Trust the automatic checks
✅ Install commands are pre-verified
✅ No need to remember security steps

## Limitations

- AI must support MCP resources (Cursor ✅, Claude Desktop ✅)
- AI must follow resource guidelines (GPT-4+ ✅, Claude 3+ ✅)
- Passive injection (can't force tool calls, but AI follows instructions)

## Result

**User**: "nodejs ile api projesi"

**AI** (thinking):
1. *Reads resource: check security first*
2. *Detects: needs http package*
3. *Runs: audit_security("express")*
4. *Runs: audit_security("fastify")*
5. *Compares*

**AI** (response):
"✅ I recommend Fastify (safer, faster than Express)
npm install fastify@4.26.0

Here's the code..."

**Zero manual checks. Fully automatic. Security-first by default.**

---

See [AI_USAGE.md](./AI_USAGE.md) for additional `.cursorrules` setup (optional, adds more trigger patterns).
