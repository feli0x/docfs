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

/**
 * Groups search results by file for better organization
 */
function groupResultsByFile(results: SearchResult[]): Map<string, SearchResult[]> {
  const grouped = new Map<string, SearchResult[]>();

  for (const result of results) {
    if (!grouped.has(result.file)) {
      grouped.set(result.file, []);
    }
    grouped.get(result.file)!.push(result);
  }

  return grouped;
}

/**
 * Formats search results for display
 */
function formatSearchResults(results: SearchResult[], rootPaths: string[], query: string): string {
  if (results.length === 0) {
    return `🔍 No matches found for "${query}"`;
  }

  const lines: string[] = [];
  const groupedResults = groupResultsByFile(results);

  lines.push(
    `🔍 Found ${results.length} matches for "${query}" in ${groupedResults.size} files:\n`,
  );

  for (const [filePath, fileResults] of groupedResults) {
    // Find the appropriate root path for relative display
    let relativePath = filePath;
    for (const root of rootPaths) {
      if (filePath.startsWith(root)) {
        relativePath = relative(root, filePath);
        break;
      }
    }

    lines.push(`📄 ${relativePath} (${fileResults.length} matches)`);

    for (const result of fileResults.slice(0, 5)) {
      // Limit matches per file for readability
      lines.push(`   Line ${result.line}: ${result.content.trim()}`);

      // Add context if available
      if (result.context && (result.context.before.length > 0 || result.context.after.length > 0)) {
        // Show context with line numbers
        const contextStart = result.line - result.context.before.length;

        for (let i = 0; i < result.context.before.length; i++) {
          const lineNum = contextStart + i;
          lines.push(`   ${lineNum}:   ${result.context.before[i]?.trim()}`);
        }

        lines.push(`   ${result.line}: > ${result.content.trim()}`); // Highlight the match

        for (let i = 0; i < result.context.after.length; i++) {
          const lineNum = result.line + 1 + i;
          lines.push(`   ${lineNum}:   ${result.context.after[i]?.trim()}`);
        }
      }

      lines.push(''); // Empty line between matches
    }

    if (fileResults.length > 5) {
      lines.push(`   ... and ${fileResults.length - 5} more matches\n`);
    }
  }

  return lines.join('\n');
}

/**
 * Creates a summary of search results
 */
function createSearchSummary(
  results: SearchResult[],
  rootPaths: string[],
  query: string,
  params: SearchFilesInput,
): string {
  const groupedResults = groupResultsByFile(results);
  const fileTypes = new Map<string, number>();

  // Analyze file types in results
  for (const filePath of groupedResults.keys()) {
    const lastDot = filePath.lastIndexOf('.');
    if (lastDot > 0) {
      const ext = filePath.substring(lastDot + 1).toLowerCase();
      fileTypes.set(ext, (fileTypes.get(ext) || 0) + 1);
    }
  }

  const lines = [
    '\n📊 Search Summary:',
    `   Query: "${query}"`,
    `   Case sensitive: ${params.caseSensitive ? 'Yes' : 'No'}`,
    `   Whole word: ${params.wholeWord ? 'Yes' : 'No'}`,
    `   Total matches: ${results.length}`,
    `   Files with matches: ${groupedResults.size}`,
    `   Searched in: ${rootPaths.length} root director${rootPaths.length === 1 ? 'y' : 'ies'}`,
  ];

  if (params.filePattern) {
    lines.push(`   File pattern: ${params.filePattern}`);
  }

  if (fileTypes.size > 0) {
    lines.push('   File types with matches:');
    const sortedTypes = Array.from(fileTypes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    for (const [ext, count] of sortedTypes) {
      lines.push(`     .${ext}: ${count} files`);
    }
  }

  return lines.join('\n');
}

/**
 * Search Files Tool Implementation
 */
export const searchFiles: ToolSpec = {
  name: 'search_files',
  description: 'Searches for text content within files in the configured root directories',
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
    const results: string[] = [];

    try {
      const searchResults = await searchInFiles(context.roots, {
        query: params.query,
        filePattern: params.filePattern,
        caseSensitive: params.caseSensitive,
        wholeWord: params.wholeWord,
        contextLines: params.contextLines,
        maxDepth: params.maxDepth,
      });

      // Limit results to maxResults
      const limitedResults = searchResults.slice(0, params.maxResults);

      // Format results for display
      const formattedResults = formatSearchResults(limitedResults, context.roots, params.query);
      const summary = createSearchSummary(limitedResults, context.roots, params.query, params);

      results.push(formattedResults);
      results.push(summary);

      if (params.maxResults && searchResults.length > params.maxResults) {
        results.push(
          `\n⚠️  Results limited to ${params.maxResults} matches (${searchResults.length} total found)`,
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push(`❌ Search failed: ${errorMessage}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: results.join('\n'),
        },
      ],
    };
  },
};
