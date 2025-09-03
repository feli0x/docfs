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

const asMock = <T>(fn: unknown) => fn as jest.MockedFunction<T>;

describe('list_files tool', () => {
  const context = { roots: ['/root'] };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders tree and summary for provided files', async () => {
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

    expect(text).toContain('📁 /root');
    expect(text).toContain('index.ts');
    expect(text).toContain('README.md');
    expect(text).toContain('📊 Summary for /root:');
    expect(text).toMatch(/Files:\s*2/);
    expect(text).toMatch(/Directories:\s*2/);
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
    expect(text).toContain('📁 /root/sub');
  });
});

