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

const asMock = <T>(fn: unknown) => fn as jest.MockedFunction<T>;

describe('search_files tool', () => {
  const context = { roots: ['/project'] };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('formats grouped results with context and summary', async () => {
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

    // Group header and per-file summaries
    expect(text).toContain('🔍 Found');
    expect(text).toContain('📄 src/app.ts (');
    expect(text).toContain('📄 README.md (');

    // Context lines formatting
    expect(text).toContain('Line 10:');
    expect(text).toContain(': > const server = new Server()');

    // Summary section
    expect(text).toContain('📊 Search Summary:');
    expect(text).toContain('Query: "server"');
    expect(text).toContain('File pattern: *.ts');

    // Results limited notice
    expect(text).toContain('Results limited to 2 matches');
  });
});

