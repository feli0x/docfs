# DocFS

DocFS is a Model Context Protocol (MCP) server that exposes read-only file system tools to MCP clients. It supports multiple root directories, filters paths using `.gitignore`, and caches file metadata in an in-memory LRU cache for faster access. Requires Node.js 18 or later.

## Tools

- `dir_tree` – view directory structure as a tree
- `list_files` – list directories and files
- `search_files` – search text across files
- `read_files` – read file contents

## Differences from a generic filesystem MCP server

DocFS trades the broader read/write capabilities of a standard filesystem server for a narrower, read-only feature set with extra safety and convenience features:

- Read-only operations only
- Limited to `dir_tree`, `list_files`, `search_files`, and `read_files`
- Enforces one or more user-specified root directories
- Applies `.gitignore` rules and caches file metadata using an in-memory LRU cache

## Quick Start

Add the server to any MCP-compatible client by including this JSON in its configuration:

JSON:

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

Claude Code:

```zsh
claude mcp add docfs -- npx -y docfs --root /path/to/project

```

Codex CLI:

```toml
[mcp_servers.docfs]
command = "npx"
args = ["-y", "docfs", "--root", "/path/to/project"]
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
