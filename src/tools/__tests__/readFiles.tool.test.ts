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

    expect(text).toContain('📄 file.ts');
    expect(text).toContain('Type: typescript');
    expect(text).toContain('Encoding: utf-8');
    // Line numbers
    expect(text).toContain('1| lineA');
    expect(text).toContain('2| lineB');
  });

  it('honors line range and shows range info', async () => {
    asMock<typeof mockGetFileInfo>(mockGetFileInfo).mockResolvedValueOnce({
      path: '/root/file.md',
      name: 'file.md',
      size: 50,
      modified: '2024-01-01T00:00:00.000Z',
      isDirectory: false,
      extension: 'md',
    } as any);
    asMock<typeof mockReadFileContent>(mockReadFileContent).mockImplementationOnce(async () => 'b\nc');

    const output = await readFilesTool.handler(
      { path: 'file.md', startLine: 2, endLine: 3, showLineNumbers: true },
      context,
    );
    const text = output.content[0]?.type === 'text' ? output.content[0].text : '';
    expect(text).toContain('(lines 2-3)');
    expect(text).toContain('2| b');
    expect(text).toContain('3| c');
  });

  it('reports error for files exceeding size limit and summarizes multiple', async () => {
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

    expect(text).toContain('ok');
    expect(text).toMatch(/Failed to read .*large\.bin.*File too large/);
    expect(text).toContain('📊 Summary: 1 files read successfully, 1 errors');
  });

  it('throws when startLine > endLine', async () => {
    await expect(
      readFilesTool.handler({ path: 'file.txt', startLine: 5, endLine: 3 }, context),
    ).rejects.toThrow('Start line cannot be greater than end line');
  });
});
