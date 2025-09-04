import { createServer } from '../index.js';
import type { ToolSpec } from '../types/index.js';

jest.mock('@modelcontextprotocol/sdk/server/index.js', () => {
  return {
    Server: class {
      _requestHandlers = new Map<string, any>();
      setRequestHandler(schema: any, handler: any) {
        this._requestHandlers.set(schema.shape.method.value, handler);
      }
    },
  };
});

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class {},
}));

jest.mock('@modelcontextprotocol/sdk/types.js', () => ({
  ListToolsRequestSchema: { shape: { method: { value: 'tools/list' } } },
  CallToolRequestSchema: { shape: { method: { value: 'tools/call' } } },
}));

jest.mock('../tools/index.js', () => {
  const dirTreeTool: ToolSpec = {
    name: 'dir_tree',
    description: 'mock dir tree',
    inputSchema: { type: 'object' },
    handler: jest.fn(async () => ({
      content: [{ type: 'text' as const, text: 'tree' }],
    })),
  };
  const listFilesTool: ToolSpec = {
    name: 'list_files',
    description: 'mock list files',
    inputSchema: { type: 'object' },
    handler: jest.fn(async () => ({
      content: [{ type: 'text' as const, text: 'list' }],
    })),
  };
  return { tools: [listFilesTool, dirTreeTool] };
});

describe('dir_tree requirement', () => {
  it('rejects tool calls before dir_tree', async () => {
    const server = createServer({ name: 'test', version: '1', roots: ['/'] });
    const handlers = (server as any)._requestHandlers as Map<string, Function>;
    const callHandler = handlers.get('tools/call')!;

    await expect(
      callHandler({ method: 'tools/call', params: { name: 'list_files' } }, {}),
    ).rejects.toThrow("Please run 'dir_tree'");
  });

  it('allows tool calls after dir_tree', async () => {
    const server = createServer({ name: 'test', version: '1', roots: ['/'] });
    const handlers = (server as any)._requestHandlers as Map<string, Function>;
    const callHandler = handlers.get('tools/call')!;

    await callHandler({ method: 'tools/call', params: { name: 'dir_tree' } }, {});

    await expect(
      callHandler({ method: 'tools/call', params: { name: 'list_files' } }, {}),
    ).resolves.toEqual({ content: [{ type: 'text', text: 'list' }] });
  });
});
