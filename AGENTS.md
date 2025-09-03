# Repository Guidelines

## MCP Tools for Agents
- list_files: Lists files/dirs within allowed roots. Params: `pattern?`, `recursive=true`, `maxDepth=10`, `includeHidden=false`, `path?` (absolute or relative to a root). Use to map structure and size/types before deeper operations.
- search_files: Finds text across files. Params: `query` (required), `filePattern?`, `caseSensitive=false`, `wholeWord=false`, `contextLines=2 (max 10)`, `maxResults=100 (max 1000)`, `maxDepth?`. Prefer narrowing via `filePattern` and sensible `maxResults`.
- read_files: Reads one or many files. Params: `path` or `paths` (max 10), `startLine?`, `endLine?`, `encoding='utf-8'`, `showLineNumbers=true`, `maxFileSize=1MB`. Supports absolute paths or paths relative to a root. Rejects directories and oversized files.

Best practices for agents:
- Prefer list_files → search_files → read_files flow to minimize I/O.
- Keep paths within configured `--root` directories; relative paths resolve against each root.
- Use patterns (e.g., `*.ts`, `docs/**/*.md`) to scope results; avoid binaries.
- Paginate searches with `maxResults` and refine queries rather than returning everything at once.
- Validate line ranges (`startLine <= endLine`) and use ranges to read only what’s needed.

## Project Structure & Module Organization
- `src/index.ts`: MCP server entry (ESM). Exposes tools over stdio; CLI bin `docfs` maps to `dist/index.js`.
- `src/tools/`: Tool implementations — `listFiles.ts`, `searchFiles.ts`, `readFiles.ts` registered via `src/tools/index.ts`.
- `src/utils/`: Filesystem helpers with path safety and I/O (`filesystem.ts`).
- `src/types/`: Shared TypeScript types for tools and results.
- `src/__tests__/`: Jest unit tests. Built output in `dist/`.

## Build, Test, and Development Commands
- `pnpm dev`: Run server in TS directly (ts-node ESM). Example: `pnpm dev -- --root .`.
- `pnpm build`: Compile TypeScript to `dist/`.
- `pnpm start`: Run compiled server (`node dist/index.js`). Example: `pnpm start -- --root ~/projects`.
- `pnpm test` | `pnpm test:watch` | `pnpm test:coverage`: Run Jest, watch mode, or coverage.
- `pnpm lint` | `pnpm lint:fix`: Lint TypeScript or auto-fix.
- `pnpm format` | `pnpm format:check`: Apply or check Prettier formatting.
- `pnpm typecheck`: Type-only compile to catch errors.

## Coding Style & Naming Conventions
- Language: TypeScript (strict, ESM). Node >= 18.
- Formatting: Prettier (2-space tabs, 100 col, single quotes, semi). Run `pnpm format`.
- Linting: ESLint + typescript-eslint + prettier-config. Prefer named exports; files use `camelCase.ts`.
- Patterns: Utility modules under `utils/`; tools under `tools/` exporting `ToolSpec`.

## Testing Guidelines
- Framework: Jest + ts-jest (ESM). Tests in `src/__tests__/` or `*.test.ts` next to source.
- Coverage: Target ≥ 80% global (branches, functions, lines, statements).
- Naming: Mirror source filenames (e.g., `filesystem.test.ts`). Run `pnpm test:watch` during development.

## Commit & Pull Request Guidelines
- Commits: Follow Conventional Commits (e.g., `feat: add read_files tool`, `fix(utils): handle large files`).
- PRs: Include clear description, rationale, and usage examples (commands/flags). Link issues when applicable.
- Checks: Ensure `pnpm build`, `pnpm lint`, and `pnpm test` pass locally; include screenshots or snippets for UX/CLI changes.

## Security & Configuration Tips
- Restrict access with `--root` flags; paths are validated against allowed roots. Example: `docfs --root ~/repo --root ~/notes`.
- The `read_files` tool enforces size limits; avoid reading large binaries. Prefer patterns (e.g., `*.ts`, `*.md`) for `list_files` and `search_files`.
 - Absolute paths must still fall under an allowed root; otherwise calls error.
 - Relative `path`/`paths` are resolved per root; if not found in any root, the call errors with guidance.
