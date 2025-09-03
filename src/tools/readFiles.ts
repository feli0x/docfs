/**
 * Read Files Tool - Reads content from one or more files
 */

import { relative, isAbsolute, resolve, normalize } from 'node:path';
import {
  readFileContent,
  validatePathAccess,
  getFileInfo,
  pathExists,
} from '../utils/filesystem.js';
import type { ToolSpec, ToolContext, ToolResult } from '../types/index.js';

interface ReadFilesInput {
  paths: string[];
  startLine?: number | undefined;
  endLine?: number | undefined;
  encoding?: BufferEncoding | undefined;
  showLineNumbers?: boolean | undefined;
  maxFileSize?: number | undefined;
}

/**
 * Validates and parses input parameters
 */
function parseInput(input: unknown): ReadFilesInput {
  const params = input as Record<string, unknown>;
  // Handle both single path and array of paths
  let paths: string[];
  if (typeof params.path === 'string') {
    paths = [params.path];
  } else if (Array.isArray(params.paths)) {
    paths = params.paths.filter((p): p is string => typeof p === 'string');
  } else if (typeof params.paths === 'string') {
    paths = [params.paths];
  } else {
    throw new Error('Either "path" or "paths" parameter is required');
  }

  if (paths.length === 0) {
    throw new Error('At least one file path is required');
  }

  if (paths.length > 10) {
    throw new Error('Maximum of 10 files can be read at once');
  }

  return {
    paths,
    startLine: typeof params.startLine === 'number' ? Math.max(1, params.startLine) : undefined,
    endLine: typeof params.endLine === 'number' ? Math.max(1, params.endLine) : undefined,
    encoding: isValidEncoding(params.encoding) ? params.encoding : 'utf-8',
    showLineNumbers: typeof params.showLineNumbers === 'boolean' ? params.showLineNumbers : true,
    maxFileSize:
      typeof params.maxFileSize === 'number' ? Math.max(1024, params.maxFileSize) : 1024 * 1024, // 1MB default
  };
}

/**
 * Validates if the encoding is supported
 */
function isValidEncoding(encoding: unknown): encoding is BufferEncoding {
  const validEncodings: BufferEncoding[] = [
    'ascii',
    'utf8',
    'utf-8',
    'utf16le',
    'ucs2',
    'ucs-2',
    'base64',
    'latin1',
    'binary',
    'hex',
  ];
  return typeof encoding === 'string' && validEncodings.includes(encoding as BufferEncoding);
}

/**
 * Adds line numbers to content
 */
function addLineNumbers(content: string, startLine: number = 1): string {
  const lines = content.split('\n');
  const maxLineNumWidth = String(startLine + lines.length - 1).length;

  return lines
    .map((line, index) => {
      const lineNum = (startLine + index).toString().padStart(maxLineNumWidth, ' ');
      return `${lineNum}| ${line}`;
    })
    .join('\n');
}

/**
 * Formats file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${units[i]}`;
}

/**
 * Detects likely content type based on file extension
 */
function getContentType(filePath: string): string {
  const ext = filePath.substring(filePath.lastIndexOf('.') + 1).toLowerCase();

  const typeMap: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    jsx: 'javascript',
    tsx: 'typescript',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    php: 'php',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    html: 'html',
    liquid: 'liquid',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    xml: 'xml',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
    zsh: 'zsh',
    fish: 'fish',
    ps1: 'powershell',
    dockerfile: 'dockerfile',
  };

  return typeMap[ext] || 'text';
}

/**
 * Resolves a file path against allowed roots and ensures it exists
 */
async function resolveFilePath(filePath: string, rootPaths: string[]): Promise<string> {
  if (isAbsolute(filePath)) {
    return validatePathAccess(filePath, rootPaths);
  }

  for (const root of rootPaths) {
    const candidate = normalize(resolve(root, filePath));
    try {
      const withinRoot = validatePathAccess(candidate, [root]);
      if (await pathExists(withinRoot)) {
        return withinRoot;
      }
    } catch {
      // Not within this root or does not exist; try next
      continue;
    }
  }

  throw new Error(
    `Path '${filePath}' not found within allowed roots. ` +
      `Provide an absolute path or a path relative to one of: ${rootPaths.join(', ')}`,
  );
}

/**
 * Reads and formats a single file
 */
async function readSingleFile(
  filePath: string,
  params: ReadFilesInput,
  rootPaths: string[],
): Promise<string> {
  const validatedPath = await resolveFilePath(filePath, rootPaths);

  // Get file info first
  const fileInfo = await getFileInfo(validatedPath);

  if (fileInfo.isDirectory) {
    throw new Error(`Cannot read directory: ${filePath}`);
  }

  // Check file size limit
  if (fileInfo.size > params.maxFileSize!) {
    throw new Error(
      `File too large: ${formatFileSize(fileInfo.size)} (max: ${formatFileSize(params.maxFileSize!)})`,
    );
  }

  // Read file content
  const content = await readFileContent(
    validatedPath,
    params.startLine,
    params.endLine,
    params.encoding,
  );

  // Format relative path for display
  let relativePath = filePath;
  for (const root of rootPaths) {
    if (validatedPath.startsWith(root)) {
      relativePath = relative(root, validatedPath);
      break;
    }
  }

  // Create file header
  const contentType = getContentType(filePath);
  const rangeInfo =
    params.startLine || params.endLine
      ? ` (lines ${params.startLine || 1}-${params.endLine || 'end'})`
      : '';

  const header = [
    `📄 ${relativePath}${rangeInfo}`,
    `   Size: ${formatFileSize(fileInfo.size)}`,
    `   Modified: ${new Date(fileInfo.modified).toLocaleString()}`,
    `   Type: ${contentType}`,
    `   Encoding: ${params.encoding}`,
    '─'.repeat(80),
  ].join('\n');

  // Format content with optional line numbers
  const formattedContent = params.showLineNumbers
    ? addLineNumbers(content, params.startLine || 1)
    : content;

  return `${header}\n${formattedContent}\n`;
}

/**
 * Read Files Tool Implementation
 */
export const readFiles: ToolSpec = {
  name: 'read_files',
  description:
    'Reads content from one or more files with optional line range selection and formatting options',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Single file path to read (alternative to paths array)',
      },
      paths: {
        oneOf: [
          { type: 'string' },
          {
            type: 'array',
            items: { type: 'string' },
            maxItems: 10,
          },
        ],
        description: 'Array of file paths to read (maximum 10 files)',
      },
      startLine: {
        type: 'number',
        description: 'Starting line number (1-based, optional)',
        minimum: 1,
      },
      endLine: {
        type: 'number',
        description: 'Ending line number (1-based, optional)',
        minimum: 1,
      },
      encoding: {
        type: 'string',
        description: 'File encoding (default: utf-8)',
        enum: [
          'ascii',
          'utf8',
          'utf-8',
          'utf16le',
          'ucs2',
          'ucs-2',
          'base64',
          'latin1',
          'binary',
          'hex',
        ],
        default: 'utf-8',
      },
      showLineNumbers: {
        type: 'boolean',
        description: 'Whether to show line numbers (default: true)',
        default: true,
      },
      maxFileSize: {
        type: 'number',
        description: 'Maximum file size to read in bytes (default: 1MB)',
        minimum: 1024,
        default: 1048576,
      },
    },
    oneOf: [{ required: ['path'] }, { required: ['paths'] }],
  },

  async handler(input: unknown, context: ToolContext): Promise<ToolResult> {
    const params = parseInput(input);
    const results: string[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Validate line range
    if (params.startLine && params.endLine && params.startLine > params.endLine) {
      throw new Error('Start line cannot be greater than end line');
    }

    for (const filePath of params.paths) {
      try {
        const fileContent = await readSingleFile(filePath, params, context.roots);
        results.push(fileContent);
        successCount++;

        // Add separator between files if reading multiple files
        if (params.paths.length > 1 && successCount < params.paths.length) {
          results.push('\n' + '═'.repeat(80) + '\n');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push(`❌ Failed to read ${filePath}: ${errorMessage}\n`);
        errorCount++;
      }
    }

    // Add summary if multiple files were processed
    if (params.paths.length > 1) {
      results.push(`\n📊 Summary: ${successCount} files read successfully, ${errorCount} errors`);
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
