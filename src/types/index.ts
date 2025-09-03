/**
 * Core types and interfaces for the DocFS MCP server
 */

export interface FileInfo {
  path: string;
  name: string;
  size: number;
  modified: string;
  isDirectory: boolean;
  extension?: string | undefined;
}

export interface SearchResult {
  file: string;
  line: number;
  content: string;
  context?: {
    before: string[];
    after: string[];
  };
}

export interface ToolContext {
  roots: string[];
}

export interface ToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

export interface ToolSpec {
  name: string;
  description?: string;
  inputSchema: unknown;
  handler: (input: unknown, context: ToolContext) => Promise<ToolResult>;
}

export interface ListFilesOptions {
  pattern?: string | undefined;
  recursive?: boolean | undefined;
  maxDepth?: number | undefined;
  includeHidden?: boolean | undefined;
}

export interface SearchFilesOptions {
  query: string;
  filePattern?: string | undefined;
  caseSensitive?: boolean | undefined;
  wholeWord?: boolean | undefined;
  contextLines?: number | undefined;
  maxDepth?: number | undefined;
}

export interface ReadFilesOptions {
  paths: string[];
  startLine?: number | undefined;
  endLine?: number | undefined;
  encoding?: BufferEncoding | undefined;
}
