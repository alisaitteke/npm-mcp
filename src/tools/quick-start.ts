import { z } from 'zod';
import { RegistryClient } from '../registry-client.js';
import type { Packument } from '../types.js';

/**
 * Schema for quick start code generation
 */
export const GenerateQuickStartSchema = z.object({
  packageName: z.string().min(1, 'Package name must not be empty'),
  version: z.string().optional(),
  framework: z
    .enum(['vanilla', 'react', 'vue', 'svelte', 'express', 'fastify', 'next', 'auto'])
    .optional()
    .default('auto'),
});

export type GenerateQuickStartParams = z.infer<typeof GenerateQuickStartSchema>;

/**
 * Generate quick start code for a package
 */
export async function generateQuickStart(
  params: GenerateQuickStartParams,
  client: RegistryClient
): Promise<string> {
  const validated = GenerateQuickStartSchema.parse(params);

  try {
    // Fetch package data
    const packument: Packument = await client.getPackage(validated.packageName);
    const targetVersion = validated.version || packument['dist-tags'].latest;
    const versionData = packument.versions[targetVersion];

    if (!versionData) {
      return JSON.stringify({
        success: false,
        error: `Version ${targetVersion} not found`,
      });
    }

    // Detect framework if auto
    let framework = validated.framework;
    if (framework === 'auto') {
      framework = detectFramework(validated.packageName, versionData);
    }

    // Generate code examples
    const examples = generateCodeExamples(
      validated.packageName,
      targetVersion,
      versionData,
      framework
    );

    return JSON.stringify(
      {
        success: true,
        package: {
          name: validated.packageName,
          version: targetVersion,
        },
        framework,
        install: generateInstallCommand(validated.packageName, targetVersion),
        examples,
        tips: generateTips(validated.packageName, versionData),
      },
      null,
      2
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return JSON.stringify({
      success: false,
      error: errorMessage,
      packageName: validated.packageName,
    });
  }
}

/**
 * Detect framework based on package name and metadata
 */
function detectFramework(
  packageName: string,
  versionData: any
): 'vanilla' | 'react' | 'vue' | 'svelte' | 'express' | 'fastify' | 'next' {
  // Check package name patterns
  if (packageName.includes('react') || versionData.peerDependencies?.react) {
    return 'react';
  }
  if (packageName.includes('vue') || versionData.peerDependencies?.vue) {
    return 'vue';
  }
  if (packageName.includes('svelte') || versionData.peerDependencies?.svelte) {
    return 'svelte';
  }
  if (packageName.includes('next') || packageName === 'next') {
    return 'next';
  }
  if (packageName === 'express') {
    return 'express';
  }
  if (packageName === 'fastify') {
    return 'fastify';
  }

  // Check keywords
  const keywords = versionData.keywords || [];
  if (keywords.includes('react')) return 'react';
  if (keywords.includes('vue')) return 'vue';
  if (keywords.includes('svelte')) return 'svelte';
  if (keywords.includes('express')) return 'express';
  if (keywords.includes('fastify')) return 'fastify';

  return 'vanilla';
}

/**
 * Generate install command
 */
function generateInstallCommand(packageName: string, version: string): object {
  return {
    npm: `npm install ${packageName}@${version}`,
    yarn: `yarn add ${packageName}@${version}`,
    pnpm: `pnpm add ${packageName}@${version}`,
    bun: `bun add ${packageName}@${version}`,
  };
}

/**
 * Generate code examples based on package and framework
 */
function generateCodeExamples(
  packageName: string,
  version: string,
  versionData: any,
  framework: string
): any {
  const examples: any = {
    basic: generateBasicExample(packageName, versionData, framework),
  };

  // Add framework-specific examples
  if (framework === 'react') {
    examples.component = generateReactExample(packageName, versionData);
  } else if (framework === 'vue') {
    examples.component = generateVueExample(packageName, versionData);
  } else if (framework === 'express' || framework === 'fastify') {
    examples.api = generateAPIExample(packageName, versionData, framework);
  }

  return examples;
}

/**
 * Generate basic usage example
 */
function generateBasicExample(packageName: string, versionData: any, framework: string): object {
  const hasESM = versionData.type === 'module' || versionData.module || versionData.exports;
  const hasTypes = versionData.types || versionData.typings;

  // Common patterns for popular packages
  const patterns: Record<string, any> = {
    axios: {
      esm: `import axios from 'axios';\n\nconst response = await axios.get('https://api.example.com/data');\nconsole.log(response.data);`,
      cjs: `const axios = require('axios');\n\naxios.get('https://api.example.com/data')\n  .then(response => console.log(response.data));`,
    },
    express: {
      esm: `import express from 'express';\n\nconst app = express();\n\napp.get('/', (req, res) => {\n  res.json({ message: 'Hello World' });\n});\n\napp.listen(3000, () => {\n  console.log('Server running on http://localhost:3000');\n});`,
      cjs: `const express = require('express');\n\nconst app = express();\n\napp.get('/', (req, res) => {\n  res.json({ message: 'Hello World' });\n});\n\napp.listen(3000);`,
    },
    fastify: {
      esm: `import Fastify from 'fastify';\n\nconst fastify = Fastify({ logger: true });\n\nfastify.get('/', async (request, reply) => {\n  return { hello: 'world' };\n});\n\nawait fastify.listen({ port: 3000 });`,
    },
    lodash: {
      esm: `import _ from 'lodash';\n\nconst array = [1, 2, 3, 4, 5];\nconst chunked = _.chunk(array, 2);\nconsole.log(chunked); // [[1, 2], [3, 4], [5]]`,
      cjs: `const _ = require('lodash');\n\nconst array = [1, 2, 3, 4, 5];\nconst chunked = _.chunk(array, 2);\nconsole.log(chunked);`,
    },
    zod: {
      esm: `import { z } from 'zod';\n\nconst UserSchema = z.object({\n  name: z.string(),\n  email: z.string().email(),\n  age: z.number().positive(),\n});\n\nconst user = UserSchema.parse({\n  name: 'John',\n  email: 'john@example.com',\n  age: 30,\n});`,
    },
  };

  // Return specific pattern if available
  if (patterns[packageName]) {
    const pattern = patterns[packageName];
    return {
      description: `Basic usage of ${packageName}`,
      language: hasTypes ? 'typescript' : 'javascript',
      code: hasESM && pattern.esm ? pattern.esm : pattern.cjs || pattern.esm,
    };
  }

  // Generic example
  const importStyle = hasESM
    ? `import ${packageName} from '${packageName}';`
    : `const ${packageName} = require('${packageName}');`;

  return {
    description: `Basic import/require`,
    language: hasTypes ? 'typescript' : 'javascript',
    code: `${importStyle}\n\n// Use ${packageName} here\nconsole.log(${packageName});`,
  };
}

/**
 * Generate React-specific example
 */
function generateReactExample(packageName: string, versionData: any): object {
  const patterns: Record<string, string> = {
    'react-hook-form': `import { useForm } from 'react-hook-form';

function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  
  const onSubmit = (data) => console.log(data);
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name', { required: true })} />
      {errors.name && <span>This field is required</span>}
      <button type="submit">Submit</button>
    </form>
  );
}`,
    'react-query': `import { useQuery } from '@tanstack/react-query';

function App() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['todos'],
    queryFn: () => fetch('/api/todos').then(res => res.json())
  });
  
  if (isLoading) return 'Loading...';
  if (error) return 'Error: ' + error.message;
  
  return <div>{data.map(todo => <div key={todo.id}>{todo.title}</div>)}</div>;
}`,
  };

  if (patterns[packageName]) {
    return {
      description: `React component using ${packageName}`,
      language: 'typescript',
      code: patterns[packageName],
    };
  }

  return {
    description: 'React component example',
    language: 'typescript',
    code: `import React from 'react';\nimport ${packageName} from '${packageName}';\n\nfunction App() {\n  return <div>Using ${packageName}</div>;\n}`,
  };
}

/**
 * Generate Vue example
 */
function generateVueExample(packageName: string, versionData: any): object {
  return {
    description: 'Vue component example',
    language: 'typescript',
    code: `<script setup lang="ts">\nimport ${packageName} from '${packageName}';\n</script>\n\n<template>\n  <div>Using ${packageName}</div>\n</template>`,
  };
}

/**
 * Generate API example
 */
function generateAPIExample(packageName: string, versionData: any, framework: string): object {
  if (framework === 'express') {
    return {
      description: 'Express API example',
      language: 'typescript',
      code: `import express from 'express';\n\nconst app = express();\napp.use(express.json());\n\napp.get('/api/users', (req, res) => {\n  res.json([{ id: 1, name: 'User 1' }]);\n});\n\napp.post('/api/users', (req, res) => {\n  const user = req.body;\n  res.status(201).json(user);\n});\n\napp.listen(3000);`,
    };
  }

  if (framework === 'fastify') {
    return {
      description: 'Fastify API example',
      language: 'typescript',
      code: `import Fastify from 'fastify';\n\nconst fastify = Fastify({ logger: true });\n\nfastify.get('/api/users', async () => {\n  return [{ id: 1, name: 'User 1' }];\n});\n\nfastify.post('/api/users', async (request) => {\n  return request.body;\n});\n\nawait fastify.listen({ port: 3000 });`,
    };
  }

  return {
    description: 'API example',
    language: 'typescript',
    code: `// API example for ${packageName}`,
  };
}

/**
 * Generate helpful tips
 */
function generateTips(packageName: string, versionData: any): string[] {
  const tips: string[] = [];

  // TypeScript tip
  if (versionData.types || versionData.typings) {
    tips.push('✅ TypeScript types included');
  } else {
    tips.push(`💡 For TypeScript, install: npm install -D @types/${packageName}`);
  }

  // ESM tip
  if (versionData.type === 'module' || versionData.exports) {
    tips.push('✅ Supports ESM (import/export)');
  }

  // Peer dependencies
  const peerDeps = versionData.peerDependencies;
  if (peerDeps && Object.keys(peerDeps).length > 0) {
    tips.push(
      `⚠️ Requires peer dependencies: ${Object.keys(peerDeps).join(', ')}`
    );
  }

  // Engine requirements
  if (versionData.engines?.node) {
    tips.push(`📦 Requires Node.js: ${versionData.engines.node}`);
  }

  return tips;
}
