#!/usr/bin/env node

/**
 * DocFS MCP Server - Main entry point
 * Provides filesystem access tools for MCP clients
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { pathExists } from './utils/filesystem.js';
import { tools } from './tools/index.js';
import type { ToolContext } from './types/index.js';

interface ServerConfig {
  name: string;
  version: string;
  roots: string[];
}

/**
 * Parses CLI arguments for --root flags
 */
function parseCliArgs(argv: string[]): string[] {
  const roots: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root' || argv[i] === '-r') {
      const rootPath = argv[i + 1];
      if (!rootPath || rootPath.startsWith('-')) {
        throw new Error('--root requires a directory path');
      }
      const expanded = rootPath.startsWith('~')
        ? rootPath.replace(/^~(?=\/|$)/, homedir())
        : rootPath;
      roots.push(resolve(expanded));
      i++; // Skip next argument as it's the root path
    }
  }

  // Default to current working directory if no roots specified
  if (roots.length === 0) {
    roots.push(process.cwd());
  }

  return roots;
}

/**
 * Validates that all root directories exist and are accessible
 */
async function validateRoots(roots: string[]): Promise<string[]> {
  const validRoots: string[] = [];

  for (const root of roots) {
    const exists = await pathExists(root);
    if (exists) {
      validRoots.push(root);
      console.error(`[INFO] Added root directory: ${root}`);
    } else {
      console.error(`[WARN] Root directory does not exist: ${root}`);
    }
  }

  if (validRoots.length === 0) {
    throw new Error('No valid root directories found');
  }

  return validRoots;
}

/**
 * Creates and configures the MCP server
 */
function createServer(config: ServerConfig): Server {
  const server = new Server(
    {
      name: config.name,
      version: config.version,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Register list tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  // Register call tool handler
  server.setRequestHandler(CallToolRequestSchema, async request => {
    const { name, arguments: args } = request.params;

    // Find the requested tool
    const tool = tools.find(t => t.name === name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    // Create tool context
    const context: ToolContext = {
      roots: config.roots,
    };

    try {
      // Execute the tool
      const result = await tool.handler(args ?? {}, context);
      return result as CallToolResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[ERROR] Tool '${name}' failed: ${errorMessage}`);
      throw new Error(`Tool execution failed: ${errorMessage}`);
    }
  });

  return server;
}

/**
 * Sets up graceful shutdown handling
 */
function setupGracefulShutdown(): void {
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

  signals.forEach(signal => {
    process.on(signal, () => {
      console.error(`[INFO] Received ${signal}, shutting down gracefully...`);
      process.exit(0);
    });
  });

  process.on('uncaughtException', (error: Error) => {
    console.error('[ERROR] Uncaught exception:', error.message);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    console.error('[ERROR] Unhandled rejection:', reason);
    process.exit(1);
  });
}

/**
 * Main function - entry point for the MCP server
 */
async function main(): Promise<void> {
  try {
    // Setup graceful shutdown
    setupGracefulShutdown();

    // Parse CLI arguments
    const rootPaths = parseCliArgs(process.argv.slice(2));

    // Validate root directories
    const validRoots = await validateRoots(rootPaths);

    // Create server configuration
    const config: ServerConfig = {
      name: 'docfs',
      version: '1.0.0',
      roots: validRoots,
    };

    // Create and configure MCP server
    const server = createServer(config);

    // Setup stdio transport
    const transport = new StdioServerTransport();

    // Start the server
    console.error(`[INFO] Starting DocFS MCP server with ${validRoots.length} root(s)`);
    await server.connect(transport);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[FATAL] Failed to start server: ${errorMessage}`);
    process.exit(1);
  }
}

// Start the server if this module is the main module
const isMain: boolean = (() : boolean => {
  try {
    // Prefer Node 20+'s import.meta.main when available (Node 20+)
    const meta = import.meta as unknown as { main?: boolean };
    if (typeof meta.main === 'boolean') {
      return meta.main;
    }
  } catch {
    // fall through to path-based check
  }
  // Fallback: normalize both paths to avoid npx/global wrapper differences
  const argv1 = process.argv[1] ? resolve(process.argv[1]) : null;
  const modulePath = resolve(fileURLToPath(import.meta.url));
  return argv1 !== null && argv1 === modulePath;
})();

if (isMain) {
  main().catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[FATAL] Unexpected error: ${errorMessage}`);
    process.exit(1);
  });
}
