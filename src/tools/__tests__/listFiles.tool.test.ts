/**
 * Tests for list_files tool handler
 */

import { listFiles as listFilesTool } from '../listFiles.js';

// Mock filesystem utils used by the tool
jest.mock('../../utils/filesystem.js', () => ({
  listFiles: jest.fn(),
  validatePathAccess: jest.fn((p: string) => p),
  pathExists: jest.fn(async () => true),
}));

import { listFiles as mockListDirectoryFiles } from '../../utils/filesystem.js';

const asMock = <T extends (...args: any[]) => any>(fn: unknown) => fn as jest.MockedFunction<T>;

describe('list_files tool', () => {
  const context = { roots: ['/root'] };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns structured data for provided files', async () => {
    asMock<typeof mockListDirectoryFiles>(mockListDirectoryFiles).mockResolvedValueOnce([
      {
        path: '/root',
        name: 'root',
        size: 0,
        modified: new Date('2024-01-01T00:00:00Z').toISOString(),
        isDirectory: true,
      },
      {
        path: '/root/src',
        name: 'src',
        size: 0,
        modified: new Date('2024-01-01T00:00:00Z').toISOString(),
        isDirectory: true,
      },
      {
        path: '/root/src/index.ts',
        name: 'index.ts',
        size: 3400,
        modified: new Date('2024-01-01T00:00:00Z').toISOString(),
        isDirectory: false,
        extension: 'ts',
      },
      {
        path: '/root/README.md',
        name: 'README.md',
        size: 2100,
        modified: new Date('2024-01-01T00:00:00Z').toISOString(),
        isDirectory: false,
        extension: 'md',
      },
    ] as any);

    const output = await listFilesTool.handler({}, context);
    const text = output.content[0]?.type === 'text' ? output.content[0].text : '';
    const data = JSON.parse(text);

    expect(Array.isArray(data)).toBe(true);
    expect(data[0]?.root).toBe('/root');
    const names = data[0]?.files.map((f: any) => f.name);
    expect(names).toEqual(expect.arrayContaining(['index.ts', 'README.md']));
  });

  it('accepts a relative path within a root', async () => {
    asMock<typeof mockListDirectoryFiles>(mockListDirectoryFiles).mockResolvedValueOnce([
      {
        path: '/root/sub',
        name: 'sub',
        size: 0,
        modified: new Date('2024-01-01T00:00:00Z').toISOString(),
        isDirectory: true,
      },
    ] as any);

    const output = await listFilesTool.handler({ path: 'sub' }, context);
    const text = output.content[0]?.type === 'text' ? output.content[0].text : '';
    const data = JSON.parse(text);
    expect(data[0]?.root).toBe('/root/sub');
  });
});
