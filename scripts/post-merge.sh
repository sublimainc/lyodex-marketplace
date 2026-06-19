#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."

# Rebuild lib/db type declarations so downstream packages see new schema columns
cd "$ROOT/lib/db"
npx tsc -p tsconfig.json

# Push the Drizzle schema to the live database so new columns/tables are never missing.
# Run drizzle-kit directly from the lib/db package to avoid pnpm filter scope
# ambiguity when lyodex-replit-upload/ is also present in the workspace.
# --force skips the interactive confirmation prompt (stdin is closed in post-merge).
node_modules/.bin/drizzle-kit push --force --config ./drizzle.config.ts
