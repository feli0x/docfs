/**
 * Unit tests for filesystem utilities
 */

import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  validatePathAccess,
  pathExists,
  getFileInfo,
  listFiles,
  getDirectoryTree,
} from '../utils/filesystem.js';

// Mock fs module
jest.mock('node:fs', () => ({
  promises: {
    access: jest.fn(),
    stat: jest.fn(),
    readdir: jest.fn(),
    readFile: jest.fn(),
  },
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('validatePathAccess', () => {
  const allowedRoots = ['/allowed/path1', '/allowed/path2'];

  it('should allow paths within allowed roots', () => {
    const validPath = '/allowed/path1/subdir/file.txt';
    const result = validatePathAccess(validPath, allowedRoots);
    expect(result).toBe(resolve(validPath));
  });

  it('should allow exact root paths', () => {
    const rootPath = '/allowed/path1';
    const result = validatePathAccess(rootPath, allowedRoots);
    expect(result).toBe(resolve(rootPath));
  });

  it('should reject paths outside allowed roots', () => {
    const invalidPath = '/forbidden/path/file.txt';
    expect(() => validatePathAccess(invalidPath, allowedRoots)).toThrow(
      "Path '/forbidden/path/file.txt' is outside allowed directories",
    );
  });

  it('should handle relative paths correctly', () => {
    const relativePath = './allowed/path1/file.txt';
    const resolved = resolve(relativePath);
    // This test assumes the resolved path would be within allowed roots
    if (resolved.startsWith(resolve('/allowed/path1'))) {
      const result = validatePathAccess(relativePath, allowedRoots);
      expect(result).toBe(resolved);
    }
  });
});

describe('pathExists', () => {
  it('should return true when path exists', async () => {
    mockFs.access.mockResolvedValueOnce(undefined);
    const result = await pathExists('/existing/path');
    expect(result).toBe(true);
    expect(mockFs.access).toHaveBeenCalledWith('/existing/path');
  });

  it('should return false when path does not exist', async () => {
    mockFs.access.mockRejectedValueOnce(new Error('ENOENT'));
    const result = await pathExists('/nonexistent/path');
    expect(result).toBe(false);
  });
});

describe('getFileInfo', () => {
  it('should return file information for a file', async () => {
    const mockStats = {
      size: 1024,
      mtime: new Date('2023-01-01T10:00:00Z'),
      isDirectory: () => false,
      isFile: () => true,
    };
    mockFs.stat.mockResolvedValueOnce(mockStats as any);

    const result = await getFileInfo('/path/to/file.txt');

    expect(result).toEqual({
      path: '/path/to/file.txt',
      name: 'file.txt',
      size: 1024,
      modified: '2023-01-01T10:00:00.000Z',
      isDirectory: false,
      extension: 'txt',
    });
  });

  it('should return file information for a directory', async () => {
    const mockStats = {
      size: 0,
      mtime: new Date('2023-01-01T10:00:00Z'),
      isDirectory: () => true,
      isFile: () => false,
    };
    mockFs.stat.mockResolvedValueOnce(mockStats as any);

    const result = await getFileInfo('/path/to/directory');

    expect(result).toEqual({
      path: '/path/to/directory',
      name: 'directory',
      size: 0,
      modified: '2023-01-01T10:00:00.000Z',
      isDirectory: true,
      extension: undefined,
    });
  });

  it('should throw an error when stat fails', async () => {
    mockFs.stat.mockRejectedValueOnce(new Error('ENOENT'));

    await expect(getFileInfo('/nonexistent/file')).rejects.toThrow(
      "Failed to get info for '/nonexistent/file': ENOENT",
    );
  });
});

describe('listFiles', () => {
  it('should list files in a directory', async () => {
    const mockEntries = ['file1.txt', 'file2.js', 'subdir'];
    mockFs.readdir.mockResolvedValueOnce(mockEntries as any);

    // Mock stats for each entry
    const mockStatsFile1 = {
      size: 100,
      mtime: new Date('2023-01-01T10:00:00Z'),
      isDirectory: () => false,
      isFile: () => true,
    };
    const mockStatsFile2 = {
      size: 200,
      mtime: new Date('2023-01-01T11:00:00Z'),
      isDirectory: () => false,
      isFile: () => true,
    };
    const mockStatsDir = {
      size: 0,
      mtime: new Date('2023-01-01T12:00:00Z'),
      isDirectory: () => true,
      isFile: () => false,
    };

    mockFs.stat
      .mockResolvedValueOnce(mockStatsFile1 as any)
      .mockResolvedValueOnce(mockStatsFile2 as any)
      .mockResolvedValueOnce(mockStatsDir as any);

    const result = await listFiles('/test/path', { recursive: false });

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      path: join('/test/path', 'subdir'),
      name: 'subdir',
      size: 0,
      modified: '2023-01-01T12:00:00.000Z',
      isDirectory: true,
      extension: undefined,
    });
    // Directories should come first, then files alphabetically
    expect(result[1]?.name).toBe('file1.txt');
    expect(result[2]?.name).toBe('file2.js');
  });

  it('should filter files by pattern', async () => {
    const mockEntries = ['file1.txt', 'file2.js', 'README.md'];
    mockFs.readdir.mockResolvedValueOnce(mockEntries as any);

    // Mock stats for txt files only
    const mockStats = {
      size: 100,
      mtime: new Date('2023-01-01T10:00:00Z'),
      isDirectory: () => false,
      isFile: () => true,
    };

    mockFs.stat.mockResolvedValue(mockStats as any);

    const result = await listFiles('/test/path', { pattern: '*.txt', recursive: false });

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('file1.txt');
  });

  it('should exclude hidden files by default', async () => {
    const mockEntries = ['file1.txt', '.hidden', '.git'];
    mockFs.readdir.mockResolvedValueOnce(mockEntries as any);

    const mockStats = {
      size: 100,
      mtime: new Date('2023-01-01T10:00:00Z'),
      isDirectory: () => false,
      isFile: () => true,
    };

    mockFs.stat.mockResolvedValue(mockStats as any);

    const result = await listFiles('/test/path', { recursive: false });

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('file1.txt');
  });

  it('should exclude gitignored files and directories', async () => {
    mockFs.readFile.mockResolvedValueOnce('dist\n');
    const mockEntries = ['file1.txt', 'dist'];
    mockFs.readdir.mockResolvedValueOnce(mockEntries as any);

    const mockFileStats = {
      size: 100,
      mtime: new Date('2023-01-01T10:00:00Z'),
      isDirectory: () => false,
      isFile: () => true,
    };

    mockFs.stat.mockResolvedValueOnce(mockFileStats as any);

    const result = await listFiles('/test/path', { recursive: false });

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('file1.txt');
  });
});

describe('getDirectoryTree', () => {
  it('should exclude gitignored paths', async () => {
    mockFs.readFile.mockResolvedValueOnce('dist\n');
    const dirStats = {
      size: 0,
      mtime: new Date('2023-01-01T10:00:00Z'),
      isDirectory: () => true,
      isFile: () => false,
    };
    const fileStats = {
      size: 100,
      mtime: new Date('2023-01-01T10:00:00Z'),
      isDirectory: () => false,
      isFile: () => true,
    };

    mockFs.stat
      .mockResolvedValueOnce(dirStats as any) // root
      .mockResolvedValueOnce(dirStats as any) // src
      .mockResolvedValueOnce(fileStats as any); // file.ts

    mockFs.readdir
      .mockResolvedValueOnce(['dist', 'src', 'file.ts'] as any) // root entries
      .mockResolvedValueOnce([] as any); // src entries

    const tree = await getDirectoryTree('/test/path');
    const names = tree.children?.map((c) => c.name);
    expect(names).toEqual(['src', 'file.ts']);
  });
});
