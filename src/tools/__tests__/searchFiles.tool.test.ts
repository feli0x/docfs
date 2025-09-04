/**
 * Tests for search_files tool handler
 */

import { searchFiles as searchFilesTool } from '../searchFiles.js';

// Mock only searchInFiles from utils to drive deterministic results
jest.mock('../../utils/filesystem.js', () => ({
  searchInFiles: jest.fn(),
}));

import { searchInFiles as mockSearchInFiles } from '../../utils/filesystem.js';
import type { SearchResult } from '../../types/index.js';

const asMock = <T extends (...args: any[]) => any>(fn: unknown) => fn as jest.MockedFunction<T>;

describe('search_files tool', () => {
  const context = { roots: ['/project'] };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns structured results with total count', async () => {
    const results: SearchResult[] = [
      {
        file: '/project/src/app.ts',
        line: 10,
        content: 'const server = new Server()',
        context: { before: ['// pre'], after: ['// post'] },
      },
      {
        file: '/project/README.md',
        line: 2,
        content: 'MCP server usage',
        context: { before: [], after: [] },
      },
      {
        file: '/project/src/app.ts',
        line: 30,
        content: 'startServer()',
        context: { before: [''], after: [''] },
      },
    ];

    asMock<typeof mockSearchInFiles>(mockSearchInFiles).mockResolvedValueOnce(results);

    const output = await searchFilesTool.handler(
      { query: 'server', filePattern: '*.ts', contextLines: 2, maxResults: 2 },
      context,
    );
    const text = output.content[0]?.type === 'text' ? output.content[0].text : '';
    const data = JSON.parse(text);

    expect(data.totalMatches).toBe(3);
    expect(data.results).toHaveLength(2);
    expect(data.results[0].file).toBe('src/app.ts');
    expect(data.results[0].context.before).toEqual(['// pre']);
    expect(data.results[1].file).toBe('README.md');
  });
});
