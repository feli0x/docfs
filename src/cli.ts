#!/usr/bin/env node

import { main } from './index.js';

// Always run the server when invoked via the CLI entry
main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[FATAL] Unexpected error: ${message}`);
  process.exit(1);
});

