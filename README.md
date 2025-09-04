# DocFS

DocFS is a Model Context Protocol (MCP) server that exposes read-only file system tools to MCP clients. Requires Node.js 18 or later.

## Tools

- `dir_tree` – view directory structure as a tree
- `list_files` – list directories and files
- `search_files` – search text across files
- `read_files` – read file contents

## Quick Start

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

Run DocFS on demand with `npx`:

```bash
npx -y docfs --root /path/to/project
```

## License

MIT
