/**
 * Tests for read_files tool handler
 */

import { readFiles as readFilesTool } from '../readFiles.js';

// Mock filesystem helpers used by the tool
jest.mock('../../utils/filesystem.js', () => ({
  readFileContent: jest.fn(),
  validatePathAccess: jest.fn((p: string) => p),
  getFileInfo: jest.fn(),
  pathExists: jest.fn(async () => true),
}));

import {
  readFileContent as mockReadFileContent,
  getFileInfo as mockGetFileInfo,
} from '../../utils/filesystem.js';

const asMock = <T extends (...args: any[]) => any>(fn: unknown) => fn as jest.MockedFunction<T>;

describe('read_files tool', () => {
  const context = { roots: ['/root'] };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads a single file with default options and line numbers', async () => {
    asMock<typeof mockGetFileInfo>(mockGetFileInfo).mockResolvedValueOnce({
      path: '/root/file.ts',
      name: 'file.ts',
      size: 20,
      modified: '2024-01-01T00:00:00.000Z',
      isDirectory: false,
      extension: 'ts',
    } as any);
    asMock<typeof mockReadFileContent>(mockReadFileContent).mockResolvedValueOnce(
      'lineA\nlineB\nlineC',
    );

    const output = await readFilesTool.handler({ path: 'file.ts' }, context);
    const text = output.content[0]?.type === 'text' ? output.content[0].text : '';
    const data = JSON.parse(text);

    expect(Array.isArray(data)).toBe(true);
    expect(data[0].path).toBe('file.ts');
    expect(data[0].content).toContain('1| lineA');
    expect(data[0].content).toContain('2| lineB');
  });

  it('honors line range and shows line numbers', async () => {
    asMock<typeof mockGetFileInfo>(mockGetFileInfo).mockResolvedValueOnce({
      path: '/root/file.md',
      name: 'file.md',
      size: 50,
      modified: '2024-01-01T00:00:00.000Z',
      isDirectory: false,
      extension: 'md',
    } as any);
    asMock<typeof mockReadFileContent>(mockReadFileContent).mockResolvedValueOnce('b\nc');

    const output = await readFilesTool.handler(
      { path: 'file.md', startLine: 2, endLine: 3, showLineNumbers: true },
      context,
    );
    const text = output.content[0]?.type === 'text' ? output.content[0].text : '';
    const data = JSON.parse(text);
    expect(data[0].content).toBe('2| b\n3| c');
  });

  it('reports error for files exceeding size limit', async () => {
    // First file OK
    asMock<typeof mockGetFileInfo>(mockGetFileInfo)
      .mockResolvedValueOnce({
        path: '/root/ok.txt',
        name: 'ok.txt',
        size: 10,
        modified: '2024-01-01T00:00:00.000Z',
        isDirectory: false,
        extension: 'txt',
      } as any)
      // Second file too large
      .mockResolvedValueOnce({
        path: '/root/large.bin',
        name: 'large.bin',
        size: 2_000_000,
        modified: '2024-01-01T00:00:00.000Z',
        isDirectory: false,
        extension: 'bin',
      } as any);

    asMock<typeof mockReadFileContent>(mockReadFileContent).mockResolvedValueOnce('ok');

    const output = await readFilesTool.handler(
      { paths: ['ok.txt', 'large.bin'], maxFileSize: 1024 },
      context,
    );
    const text = output.content[0]?.type === 'text' ? output.content[0].text : '';
    const data = JSON.parse(text);

    expect(data[0].content).toBe('1| ok');
    expect(data[1].error).toMatch(/File too large/);
  });

  it('throws when startLine > endLine', async () => {
    await expect(
      readFilesTool.handler({ path: 'file.txt', startLine: 5, endLine: 3 }, context),
    ).rejects.toThrow('Start line cannot be greater than end line');
  });
});
