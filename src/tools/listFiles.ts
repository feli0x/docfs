/**
 * List Files Tool - Returns a structured list of files and directories
 */

import { isAbsolute, resolve, normalize } from 'node:path';
import {
  listFiles as listDirectoryFiles,
  validatePathAccess,
  pathExists,
} from '../utils/filesystem.js';
import type { ToolSpec, ToolContext, ToolResult, FileInfo } from '../types/index.js';

interface ListFilesInput {
  pattern?: string | undefined;
  recursive?: boolean | undefined;
  maxDepth?: number | undefined;
  includeHidden?: boolean | undefined;
  path?: string | undefined;
}

/**
 * Validates and parses input parameters
 */
function parseInput(input: unknown): ListFilesInput {
  const params = input as Record<string, unknown>;
  return {
    pattern: typeof params.pattern === 'string' ? params.pattern : undefined,
    recursive: typeof params.recursive === 'boolean' ? params.recursive : true,
    maxDepth: typeof params.maxDepth === 'number' ? Math.max(1, params.maxDepth) : 10,
    includeHidden: typeof params.includeHidden === 'boolean' ? params.includeHidden : false,
    path: typeof params.path === 'string' ? params.path : undefined,
  };
}

export const listFiles: ToolSpec = {
  name: 'list_files',
  description:
    'Lists files and directories in the configured root directories and returns JSON data',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'Optional glob pattern to filter files (e.g., "*.js", "*.md")',
      },
      recursive: {
        type: 'boolean',
        description: 'Whether to list files recursively (default: true)',
        default: true,
      },
      maxDepth: {
        type: 'number',
        description: 'Maximum directory depth to traverse (default: 10)',
        default: 10,
        minimum: 1,
      },
      includeHidden: {
        type: 'boolean',
        description: 'Whether to include hidden files and directories (default: false)',
        default: false,
      },
      path: {
        type: 'string',
        description: 'Optional specific path within the root directories to list',
      },
    },
  },

  async handler(input: unknown, context: ToolContext): Promise<ToolResult> {
    const params = parseInput(input);
    const results: Array<{ root: string; files?: FileInfo[]; error?: string }> = [];

    // Determine which paths to list
    let pathsToList: string[];

    if (params.path) {
      if (isAbsolute(params.path)) {
        pathsToList = [validatePathAccess(params.path, context.roots)];
      } else {
        // Resolve relative path against each root and include those that exist
        const candidates: string[] = [];
        for (const root of context.roots) {
          const candidate = normalize(resolve(root, params.path));
          try {
            const withinRoot = validatePathAccess(candidate, [root]);
            if (await pathExists(withinRoot)) {
              candidates.push(withinRoot);
            }
          } catch {
            // skip; not within this root
          }
        }

        if (candidates.length === 0) {
          throw new Error(
            `Path '${params.path}' not found within allowed roots. ` +
              `Provide an absolute path or a path relative to one of: ${context.roots.join(', ')}`,
          );
        }
        pathsToList = candidates;
      }
    } else {
      pathsToList = context.roots;
    }

    for (const rootPath of pathsToList) {
      try {
        const files = await listDirectoryFiles(rootPath, {
          pattern: params.pattern,
          recursive: params.recursive,
          maxDepth: params.maxDepth,
          includeHidden: params.includeHidden,
        });
        results.push({ root: rootPath, files });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({ root: rootPath, error: message });
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results),
        },
      ],
    };
  },
};
