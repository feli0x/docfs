/**
 * Tests for dir_tree tool handler
 */

import { dirTree } from '../dirTree.js';

jest.mock('../../utils/filesystem.js', () => ({
  getDirectoryTree: jest.fn(),
  validatePathAccess: jest.fn((p: string) => p),
  pathExists: jest.fn(async () => true),
}));

import { getDirectoryTree } from '../../utils/filesystem.js';

const asMock = <T extends (...args: any[]) => any>(fn: unknown) => fn as jest.MockedFunction<T>;

describe('dir_tree tool', () => {
  const context = { roots: ['/root'] };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns tree data for provided path', async () => {
    asMock<typeof getDirectoryTree>(getDirectoryTree).mockResolvedValueOnce({
      path: '/root',
      name: 'root',
      size: 0,
      modified: new Date('2024-01-01T00:00:00Z').toISOString(),
      isDirectory: true,
      children: [
        {
          path: '/root/file.txt',
          name: 'file.txt',
          size: 100,
          modified: new Date('2024-01-01T00:00:00Z').toISOString(),
          isDirectory: false,
          extension: 'txt',
        },
      ],
    } as any);

    const output = await dirTree.handler({}, context);
    const text = output.content[0]?.type === 'text' ? output.content[0].text : '';
    const data = JSON.parse(text);
    expect(data[0]?.root).toBe('/root');
    expect(data[0]?.tree?.children?.[0]?.name).toBe('file.txt');
  });

  it('accepts a relative path within a root', async () => {
    asMock<typeof getDirectoryTree>(getDirectoryTree).mockResolvedValueOnce({
      path: '/root/sub',
      name: 'sub',
      size: 0,
      modified: new Date('2024-01-01T00:00:00Z').toISOString(),
      isDirectory: true,
    } as any);

    const output = await dirTree.handler({ path: 'sub' }, context);
    const text = output.content[0]?.type === 'text' ? output.content[0].text : '';
    const data = JSON.parse(text);
    expect(data[0]?.root).toBe('/root/sub');
  });
});
