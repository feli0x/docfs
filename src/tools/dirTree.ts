/**
 * Dir Tree Tool - Returns a nested directory structure
 */

import { isAbsolute, resolve, normalize } from 'node:path';
import {
  getDirectoryTree,
  validatePathAccess,
  pathExists,
} from '../utils/filesystem.js';
import type { ToolSpec, ToolContext, ToolResult, DirTreeNode } from '../types/index.js';

interface DirTreeInput {
  path?: string | undefined;
  maxDepth: number;
  includeHidden: boolean;
}

function parseInput(input: unknown): DirTreeInput {
  const params = input as Record<string, unknown>;
  return {
    path: typeof params.path === 'string' ? params.path : undefined,
    maxDepth: typeof params.maxDepth === 'number' ? Math.max(1, params.maxDepth) : 10,
    includeHidden: typeof params.includeHidden === 'boolean' ? params.includeHidden : false,
  };
}

export const dirTree: ToolSpec = {
  name: 'dir_tree',
  description: 'Returns a nested directory tree for the specified path',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Optional path within the root directories to list',
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
    },
  },

  async handler(input: unknown, context: ToolContext): Promise<ToolResult> {
    const params = parseInput(input);
    const results: Array<{ root: string; tree?: DirTreeNode; error?: string }> = [];

    let pathsToList: string[];

    if (params.path) {
      if (isAbsolute(params.path)) {
        pathsToList = [validatePathAccess(params.path, context.roots)];
      } else {
        const candidates: string[] = [];
        for (const root of context.roots) {
          const candidate = normalize(resolve(root, params.path));
          try {
            const withinRoot = validatePathAccess(candidate, [root]);
            if (await pathExists(withinRoot)) {
              candidates.push(withinRoot);
            }
          } catch {
            continue;
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
        const tree = await getDirectoryTree(rootPath, {
          maxDepth: params.maxDepth,
          includeHidden: params.includeHidden,
        });
        results.push({ root: rootPath, tree });
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
