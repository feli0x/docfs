/**
 * List Files Tool - Creates a tree view of configured directories
 */

import { relative, isAbsolute, resolve, normalize } from 'node:path';
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

/**
 * Creates a tree-like text representation of files
 */
function createTreeView(files: FileInfo[], rootPath: string): string {
  const lines: string[] = [];
  const pathMap = new Map<string, FileInfo[]>();

  // Group files by directory
  for (const file of files) {
    const dir = file.isDirectory ? file.path : file.path.substring(0, file.path.lastIndexOf('/'));
    if (!pathMap.has(dir)) {
      pathMap.set(dir, []);
    }
    pathMap.get(dir)!.push(file);
  }

  // Create tree structure
  lines.push(`📁 ${rootPath}`);

  const sortedFiles = files
    .filter(f => f.path !== rootPath)
    .sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.path.localeCompare(b.path);
    });

  for (let i = 0; i < sortedFiles.length; i++) {
    const file = sortedFiles[i]!;
    const relativePath = relative(rootPath, file.path);
    const depth = relativePath.split('/').length - 1;
    const isLast = i === sortedFiles.length - 1;

    const prefix = '  '.repeat(depth) + (isLast ? '└── ' : '├── ');
    const icon = file.isDirectory ? '📁' : getFileIcon(file.extension);
    const size = file.isDirectory ? '' : ` (${formatFileSize(file.size)})`;

    lines.push(`${prefix}${icon} ${file.name}${size}`);
  }

  return lines.join('\n');
}

/**
 * Gets an appropriate icon for file type
 */
function getFileIcon(extension?: string): string {
  if (!extension) return '📄';

  const iconMap: Record<string, string> = {
    js: '🟨',
    ts: '🔷',
    py: '🐍',
    java: '☕',
    cpp: '⚙️',
    c: '⚙️',
    html: '🌐',
    css: '🎨',
    json: '📋',
    xml: '📋',
    md: '📝',
    txt: '📄',
    pdf: '📕',
    jpg: '🖼️',
    png: '🖼️',
    gif: '🖼️',
    mp4: '🎬',
    mp3: '🎵',
    zip: '📦',
    tar: '📦',
    gz: '📦',
  };

  return iconMap[extension.toLowerCase()] || '📄';
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
 * Creates summary information about the listed files
 */
function createSummary(files: FileInfo[], rootPath: string): string {
  const stats = {
    totalFiles: files.filter(f => !f.isDirectory).length,
    totalDirectories: files.filter(f => f.isDirectory).length,
    totalSize: files.filter(f => !f.isDirectory).reduce((sum, f) => sum + f.size, 0),
    fileTypes: new Map<string, number>(),
  };

  // Count file types
  for (const file of files) {
    if (!file.isDirectory && file.extension) {
      const ext = file.extension.toLowerCase();
      stats.fileTypes.set(ext, (stats.fileTypes.get(ext) || 0) + 1);
    }
  }

  const lines = [
    `\n📊 Summary for ${rootPath}:`,
    `   Files: ${stats.totalFiles}`,
    `   Directories: ${stats.totalDirectories}`,
    `   Total size: ${formatFileSize(stats.totalSize)}`,
  ];

  if (stats.fileTypes.size > 0) {
    lines.push('   File types:');
    const sortedTypes = Array.from(stats.fileTypes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Show top 5 file types

    for (const [ext, count] of sortedTypes) {
      lines.push(`     .${ext}: ${count}`);
    }
  }

  return lines.join('\n');
}

/**
 * List Files Tool Implementation
 */
export const listFiles: ToolSpec = {
  name: 'list_files',
  description:
    'Lists files and directories in the configured root directories with optional filtering and tree visualization',
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
    const results: string[] = [];

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

        // Create tree view
        const treeView = createTreeView(files, rootPath);
        const summary = createSummary(files, rootPath);

        results.push(treeView);
        results.push(summary);

        if (pathsToList.length > 1) {
          results.push('\n' + '─'.repeat(80) + '\n'); // Separator between roots
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push(`❌ Error listing files in ${rootPath}: ${errorMessage}`);
      }
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
