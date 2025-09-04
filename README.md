# DocFS

DocFS is a Model Context Protocol (MCP) server that exposes read-only file system tools to MCP clients. Requires Node.js 18 or later.

## Tools

- `list_files` – list directories and files
- `search_files` – search text across files
- `read_files` – read file contents
- `dir_tree` – view directory structure as a tree

### dir_tree

The `dir_tree` tool returns a nested representation of files and folders.
It accepts the following optional parameters:

- `path` – limit traversal to a specific path
- `maxDepth` – how deep to traverse (default: 10)
- `includeHidden` – include dotfiles when `true`

Example request:

```json
{
  "name": "dir_tree",
  "arguments": { "path": ".", "maxDepth": 2 }
}
```

## Quick Start

Run DocFS on demand with `npx`:

```bash
npx -y docfs --root /path/to/project
```

Add the server to any MCP-compatible client by including this JSON in its configuration:

```json
{
  "mcpServers": {
    "docfs": {
      "command": "npx",
      "args": ["-y", "docfs", "--root", "/path/to/project"]
    }
  }
}
```

Replace `/path/to/project` with the directory you want to expose. Repeat `--root` to allow multiple directories.

## Development

```bash
pnpm install
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## License

MIT

