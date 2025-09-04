/**
 * Search Files Tool - Searches for content within files
 */

import { relative } from 'node:path';
import { searchInFiles } from '../utils/filesystem.js';
import type { ToolSpec, ToolContext, ToolResult, SearchResult } from '../types/index.js';

interface SearchFilesInput {
  query: string;
  filePattern?: string | undefined;
  caseSensitive?: boolean | undefined;
  wholeWord?: boolean | undefined;
  contextLines?: number | undefined;
  maxResults?: number | undefined;
  maxDepth?: number | undefined;
}

/**
 * Validates and parses input parameters
 */
function parseInput(input: unknown): SearchFilesInput {
  const params = input as Record<string, unknown>;
  const query = params.query;
  if (typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('Query parameter is required and must be a non-empty string');
  }

  return {
    query: query.trim(),
    filePattern: typeof params.filePattern === 'string' ? params.filePattern : undefined,
    caseSensitive: typeof params.caseSensitive === 'boolean' ? params.caseSensitive : false,
    wholeWord: typeof params.wholeWord === 'boolean' ? params.wholeWord : false,
    contextLines:
      typeof params.contextLines === 'number' ? Math.max(0, Math.min(10, params.contextLines)) : 2,
    maxResults:
      typeof params.maxResults === 'number' ? Math.max(1, Math.min(1000, params.maxResults)) : 100,
    maxDepth: typeof params.maxDepth === 'number' ? Math.max(1, params.maxDepth) : undefined,
  };
}

function makeRelative(filePath: string, roots: string[]): string {
  for (const root of roots) {
    if (filePath.startsWith(root)) {
      return relative(root, filePath);
    }
  }
  return filePath;
}

export const searchFiles: ToolSpec = {
  name: 'search_files',
  description: 'Searches for text content within files and returns JSON data',
  inputSchema: {
    type: 'object',
    required: ['query'],
    properties: {
      query: {
        type: 'string',
        description: 'The text to search for within files',
        minLength: 1,
      },
      filePattern: {
        type: 'string',
        description: 'Optional glob pattern to filter files to search (e.g., "*.js", "*.md")',
      },
      caseSensitive: {
        type: 'boolean',
        description: 'Whether the search should be case sensitive (default: false)',
        default: false,
      },
      wholeWord: {
        type: 'boolean',
        description: 'Whether to match whole words only (default: false)',
        default: false,
      },
      contextLines: {
        type: 'number',
        description: 'Number of lines of context to show around matches (default: 2, max: 10)',
        default: 2,
        minimum: 0,
        maximum: 10,
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of results to return (default: 100, max: 1000)',
        default: 100,
        minimum: 1,
        maximum: 1000,
      },
      maxDepth: {
        type: 'number',
        description: 'Maximum directory depth to traverse when searching (defaults to 10)',
        minimum: 1,
      },
    },
  },

  async handler(input: unknown, context: ToolContext): Promise<ToolResult> {
    const params = parseInput(input);

    try {
      const searchResults = await searchInFiles(context.roots, {
        query: params.query,
        filePattern: params.filePattern,
        caseSensitive: params.caseSensitive,
        wholeWord: params.wholeWord,
        contextLines: params.contextLines,
        maxDepth: params.maxDepth,
      });

      const limitedResults = searchResults.slice(0, params.maxResults);
      const mappedResults = limitedResults.map((r: SearchResult) => ({
        file: makeRelative(r.file, context.roots),
        line: r.line,
        content: r.content,
        context: r.context,
      }));

      const output = {
        results: mappedResults,
        totalMatches: searchResults.length,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(output),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: message }),
          },
        ],
        isError: true,
      };
    }
  },
};
