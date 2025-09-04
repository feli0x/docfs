# Repository Guidelines

DocFS is a read-only filesystem MCP server with multiple root support, `.gitignore` filtering, and an
in-memory LRU cache for file metadata. Compared to a generic filesystem MCP server, it offers only
inspection tools and strictly validates paths against the configured roots.

## MCP Tools for Agents

- `list_files`: list files and directories
- `search_files`: search text in files
- `read_files`: read file contents
- `dir_tree`: list directory tree

Use `list_files` ➜ `search_files` ➜ `read_files` ➜ `dir_tree` to explore the repo. Keep paths within allowed `--root` directories.

## Project Structure

- `src/index.ts` – server entry
- `src/tools/` – tool implementations
- `src/utils/` – filesystem helpers
- `src/types/` – shared types
- `src/__tests__/` – Jest tests

## Commands

- `pnpm install` – install dependencies
- `pnpm dev` – run server in TS
- `pnpm build` – compile to `dist/`
- `pnpm start` – run compiled server
- `pnpm lint` / `pnpm lint:fix`
- `pnpm format` / `pnpm format:check`
- `pnpm test`
- `pnpm typecheck`

## Style

- TypeScript (strict ESM), Node >= 18
- Prettier: 2 spaces, 100 columns, single quotes, semicolons
- ESLint with typescript-eslint; prefer named exports and `camelCase.ts`

## Testing

- Jest with ts-jest
- Tests in `src/__tests__/` or `*.test.ts`
- Target ≥ 80% coverage

## Commit & PR Guidelines

- Conventional Commits (e.g., `docs: update readme`)
- Ensure `pnpm build`, `pnpm lint`, and `pnpm test` pass before committing
- PRs should include clear descriptions and usage examples

## Security

- Only files under specified `--root` directories are accessible
- `read_files` enforces file size limits; avoid large binaries
