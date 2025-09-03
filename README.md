# DocFS - MCP File System Server

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue.svg)](https://www.typescriptlang.org/)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.17.5-green.svg)](https://github.com/modelcontextprotocol/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

DocFS is a Model Context Protocol (MCP) server that provides intelligent access to local file system content. It's designed to work seamlessly with AI models to help them understand, search, and retrieve information from your local files and directories.

## 🚀 Features

- **📁 Smart File Listing**: Create tree views of directory structures with metadata
- **🔍 Content Search**: Search across files with context, pattern matching, and filtering
- **📄 File Reading**: Read single or multiple files with line range support
- **🔒 Security**: Path validation ensures access only to allowed directories
- **⚡ Performance**: Efficient file operations with configurable limits
- **🎨 Rich Output**: Formatted output with icons, syntax highlighting hints, and summaries

## 📦 Installation

### Prerequisites

- Node.js 18.x or higher
- pnpm, npm, or yarn

### Install Dependencies

```bash
pnpm install
```

### Build the Project

```bash
pnpm run build
```

## 🛠️ Usage

### Basic Usage

Run the server with a specific root directory:

```bash
pnpm start --root /path/to/your/project
```

### Multiple Root Directories

You can specify multiple root directories:

```bash
pnpm start --root /path/to/project1 --root /path/to/project2
```

### Default Behavior

If no `--root` is specified, the current working directory is used:

```bash
pnpm start
```

## 🔧 Available Tools

### 1. `list_files` - Directory Listing

Creates a visual tree structure of files and directories with metadata.

**Parameters:**
- `pattern` (optional): Glob pattern to filter files (e.g., `"*.js"`, `"*.md"`)
- `recursive` (optional): Whether to list recursively (default: `true`)
- `maxDepth` (optional): Maximum directory depth (default: `10`)
- `includeHidden` (optional): Include hidden files (default: `false`)
- `path` (optional): Specific path within roots to list

**Example Output:**
```
📁 /Users/felix/project
├── 📝 README.md (2.1 KB)
├── 📋 package.json (1.2 KB)
├── 📁 src/
│   ├── 🔷 index.ts (3.4 KB)
│   └── 📁 tools/
│       ├── 🔷 listFiles.ts (8.1 KB)
│       └── 🔷 searchFiles.ts (7.2 KB)
└── 📊 Summary for /Users/felix/project:
   Files: 4
   Directories: 2
   Total size: 21.0 KB
   File types:
     .ts: 3
     .md: 1
     .json: 1
```

### 2. `search_files` - Content Search

Searches for text content within files across the configured directories.

**Parameters:**
- `query` (required): Text to search for
- `filePattern` (optional): Glob pattern for files to search
- `caseSensitive` (optional): Case-sensitive search (default: `false`)
- `wholeWord` (optional): Match whole words only (default: `false`)
- `contextLines` (optional): Lines of context around matches (default: `2`, max: `10`)
- `maxResults` (optional): Maximum results to return (default: `100`, max: `1000`)

**Example Output:**
```
🔍 Found 3 matches for "MCP server" in 2 files:

📄 src/index.ts (2 matches)
   Line 45: const server = new Server({
   43:   const allowedRoots = await validateRoots(rootPaths);
   44:   
   45: > const server = new Server({
   46:     name: 'docfs',
   47:     version: '1.0.0',

📊 Search Summary:
   Query: "MCP server"
   Total matches: 3
   Files with matches: 2
   File types with matches:
     .ts: 2 files
```

### 3. `read_files` - File Content Reading

Reads content from one or more files with optional line range selection.

**Parameters:**
- `path` or `paths` (required): Single file path or array of paths (max 10 files)
- `startLine` (optional): Starting line number (1-based)
- `endLine` (optional): Ending line number (1-based)
- `encoding` (optional): File encoding (default: `utf-8`)
- `showLineNumbers` (optional): Show line numbers (default: `true`)
- `maxFileSize` (optional): Max file size in bytes (default: 1MB)

**Example Output:**
```
📄 src/index.ts (lines 1-20)
   Size: 3.4 KB
   Modified: 12/15/2023, 10:30:45 AM
   Type: typescript
   Encoding: utf-8
────────────────────────────────────────────────────────────────
 1| #!/usr/bin/env node
 2| 
 3| import { Server } from '@modelcontextprotocol/sdk/server/index.js';
 4| import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
 5| // ... rest of file content
```

## 🧪 Development

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Code Quality

```bash
# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Check formatting
pnpm format:check

# Type checking
pnpm typecheck
```

### Development Mode

For development with auto-restart:

```bash
pnpm dev --root /path/to/test/directory
```

## 🏗️ Architecture

### Clean Code Principles

This project follows clean code principles:

- **Single Responsibility**: Each module has one clear purpose
- **Dependency Injection**: Tools receive context and dependencies
- **Error Handling**: Comprehensive error handling with meaningful messages
- **Type Safety**: Full TypeScript with strict mode enabled
- **Testing**: Unit tests with high coverage requirements
- **Documentation**: JSDoc comments on all public functions

### Project Structure

```
src/
├── index.ts              # Main server entry point
├── types/                # TypeScript type definitions
│   └── index.ts
├── utils/                # Utility functions
│   └── filesystem.ts     # File system operations
├── tools/                # MCP tools implementation
│   ├── index.ts          # Tools registry
│   ├── listFiles.ts      # Directory listing tool
│   ├── searchFiles.ts    # Content search tool
│   └── readFiles.ts      # File reading tool
└── __tests__/            # Unit tests
    └── filesystem.test.ts
```

### Security Features

- **Path Validation**: All file access is validated against allowed root directories
- **Sandboxing**: No access to files outside configured roots
- **Size Limits**: Configurable file size limits prevent memory issues
- **Input Validation**: All tool inputs are validated and sanitized
- **Error Boundaries**: Proper error handling prevents information leakage

## 🔧 Configuration

### Environment Variables

The server respects the following environment variables:

- `NODE_ENV`: Set to `development` for additional logging
- `DEBUG`: Enable debug output for troubleshooting

### MCP Client Configuration

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "docfs": {
      "command": "pnpm",
      "args": ["start", "--root", "/path/to/your/files"],
      "cwd": "/path/to/docfs"
    }
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes following the code style
4. Run tests: `pnpm test`
5. Run linting: `pnpm lint`
6. Commit changes: `git commit -am 'Add amazing feature'`
7. Push to branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Code Style Guidelines

- Use TypeScript with strict mode
- Follow clean code principles
- Add JSDoc comments to public functions
- Write unit tests for new functionality
- Keep functions under 30 lines when possible
- Use descriptive variable names

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Model Context Protocol](https://github.com/modelcontextprotocol) for the SDK
- The TypeScript and Node.js communities for excellent tooling
- Contributors and users who help improve this project

## 📞 Support

- 🐛 [Bug Reports](https://github.com/your-username/docfs/issues)
- 💡 [Feature Requests](https://github.com/your-username/docfs/issues)
- 📖 [Documentation](https://github.com/your-username/docfs/wiki)

---

Made with ❤️ and clean code principles
