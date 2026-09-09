#!/usr/bin/env bash
# CaseDive setup — macOS/Linux convenience wrapper around scripts/setup.mjs.
#
# Usage:
#   bash scripts/setup.sh
#   bash scripts/setup.sh --dry-run
#
# Or just use the cross-platform entry point: npm run setup
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found. Install Node 20+ from https://nodejs.org (macOS: 'brew install node') and re-run." >&2
  exit 1
fi

exec node scripts/setup.mjs "$@"
