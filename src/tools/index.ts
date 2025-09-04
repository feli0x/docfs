/**
 * DocFS MCP Server Tools
 *
 * This module exports all available tools for the DocFS MCP server.
 * Each tool provides specific functionality for accessing and searching
 * local file system content.
 */

import { listFiles } from './listFiles.js';
import { searchFiles } from './searchFiles.js';
import { readFiles } from './readFiles.js';
import { dirTree } from './dirTree.js';
import type { ToolSpec } from '../types/index.js';

/**
 * Array of all available tools
 *
 * Tools are designed to work together intelligently:
 * - list_files: Provides overview and structure
 * - search_files: Finds content across files
 * - read_files: Retrieves specific file content
 */
export const tools: ToolSpec[] = [listFiles, searchFiles, readFiles, dirTree];

/**
 * Export individual tools for direct access
 */
export { listFiles, searchFiles, readFiles, dirTree };

/**
 * Export types for consumers
 */
export type { ToolSpec, ToolContext, ToolResult } from '../types/index.js';
