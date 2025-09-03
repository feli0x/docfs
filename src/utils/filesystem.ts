/**
 * Filesystem utilities for safe file operations within allowed directories
 */

import { promises as fs } from 'node:fs';
import { join, normalize, resolve, extname, basename, sep } from 'node:path';
import type {
  FileInfo,
  ListFilesOptions,
  SearchResult,
  SearchFilesOptions,
} from '../types/index.js';

/**
 * Validates if a path is within the allowed root directories
 */
export function validatePathAccess(targetPath: string, allowedRoots: string[]): string {
  const normalized = normalize(resolve(targetPath));

  for (const root of allowedRoots) {
    const normalizedRoot = normalize(resolve(root));
    if (normalized.startsWith(normalizedRoot + sep) || normalized === normalizedRoot) {
      return normalized;
    }
  }

  throw new Error(`Path '${targetPath}' is outside allowed directories`);
}

/**
 * Checks if a file or directory exists
 */
export async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets file information with error handling
 */
export async function getFileInfo(path: string): Promise<FileInfo> {
  try {
    const stats = await fs.stat(path);
    const fileName = basename(path);
    const fileExt = stats.isFile() ? extname(path).slice(1) : undefined;

    return {
      path,
      name: fileName,
      size: stats.size,
      modified: stats.mtime.toISOString(),
      isDirectory: stats.isDirectory(),
      extension: fileExt,
    };
  } catch (error) {
    throw new Error(`Failed to get info for '${path}': ${(error as Error).message}`);
  }
}

/**
 * Lists files in a directory with filtering options
 */
export async function listFiles(
  rootPath: string,
  options: ListFilesOptions = {},
): Promise<FileInfo[]> {
  const { recursive = true, maxDepth = 10, includeHidden = false, pattern } = options;
  const results: FileInfo[] = [];

  await walkDirectory(rootPath, results, 0, maxDepth, recursive, includeHidden, pattern);

  return results.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Recursively walks a directory tree
 */
async function walkDirectory(
  dirPath: string,
  results: FileInfo[],
  currentDepth: number,
  maxDepth: number,
  recursive: boolean,
  includeHidden: boolean,
  pattern?: string,
): Promise<void> {
  if (currentDepth > maxDepth) return;

  try {
    const entries = await fs.readdir(dirPath);

    for (const entry of entries) {
      if (!includeHidden && entry.startsWith('.')) continue;

      const fullPath = join(dirPath, entry);
      const fileInfo = await getFileInfo(fullPath);

      if (fileInfo.isDirectory) {
        // Always include directories and continue traversal regardless of pattern,
        // so we don't prematurely stop exploring nested files that may match.
        results.push(fileInfo);
        if (recursive) {
          await walkDirectory(
            fullPath,
            results,
            currentDepth + 1,
            maxDepth,
            recursive,
            includeHidden,
            pattern,
          );
        }
        continue;
      }

      // For files, apply pattern filtering (if provided)
      if (pattern && !matchesPattern(fileInfo.name, pattern)) continue;

      results.push(fileInfo);
    }
  } catch (error) {
    console.warn(`Failed to read directory '${dirPath}': ${(error as Error).message}`);
  }
}

/**
 * Simple pattern matching for file names
 */
function matchesPattern(fileName: string, pattern: string): boolean {
  const regex = new RegExp(
    pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.'),
    'i',
  );
  return regex.test(fileName);
}

/**
 * Searches for text content within files
 */
export async function searchInFiles(
  rootPaths: string[],
  options: SearchFilesOptions,
): Promise<SearchResult[]> {
  const {
    query,
    filePattern,
    caseSensitive = false,
    wholeWord = false,
    contextLines = 2,
    maxDepth,
  } = options;
  const results: SearchResult[] = [];

  for (const rootPath of rootPaths) {
    await searchInDirectory(
      rootPath,
      query,
      caseSensitive,
      wholeWord,
      contextLines,
      filePattern,
      maxDepth,
      results,
    );
  }

  return results;
}

/**
 * Searches for text in a single directory
 */
async function searchInDirectory(
  dirPath: string,
  query: string,
  caseSensitive: boolean,
  wholeWord: boolean,
  contextLines: number,
  filePattern: string | undefined,
  maxDepth: number | undefined,
  results: SearchResult[],
): Promise<void> {
  try {
    const files = await listFiles(dirPath, { pattern: filePattern, maxDepth });

    for (const file of files) {
      if (file.isDirectory) continue;

      try {
        await searchInFile(file.path, query, caseSensitive, wholeWord, contextLines, results);
      } catch (error) {
        console.warn(`Failed to search in file '${file.path}': ${(error as Error).message}`);
      }
    }
  } catch (error) {
    console.warn(`Failed to search in directory '${dirPath}': ${(error as Error).message}`);
  }
}

/**
 * Searches for text in a single file
 */
async function searchInFile(
  filePath: string,
  query: string,
  caseSensitive: boolean,
  wholeWord: boolean,
  contextLines: number,
  results: SearchResult[],
): Promise<void> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  const flags = caseSensitive ? 'g' : 'gi';
  const pattern = wholeWord ? `\\b${escapeRegExp(query)}\\b` : escapeRegExp(query);
  const regex = new RegExp(pattern, flags);

  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i]!)) {
      const before = lines.slice(Math.max(0, i - contextLines), i);
      const after = lines.slice(i + 1, i + 1 + contextLines);

      results.push({
        file: filePath,
        line: i + 1,
        content: lines[i]!,
        context: { before, after },
      });
    }
  }
}

/**
 * Escapes special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Reads file content with optional line range
 */
export async function readFileContent(
  filePath: string,
  startLine?: number,
  endLine?: number,
  encoding: BufferEncoding = 'utf-8',
): Promise<string> {
  try {
    const content = await fs.readFile(filePath, encoding);

    if (startLine === undefined && endLine === undefined) {
      return content;
    }

    const lines = content.split('\n');
    const start = Math.max(0, (startLine ?? 1) - 1);
    const end = Math.min(lines.length, endLine ?? lines.length);

    return lines.slice(start, end).join('\n');
  } catch (error) {
    throw new Error(`Failed to read file '${filePath}': ${(error as Error).message}`);
  }
}
