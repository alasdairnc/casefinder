#!/bin/sh
# PostToolUse lint hook — runs eslint --fix on .js/.jsx files after edits.
# Surfaces eslint output but always exits 0 so saves are never blocked.

FILE="$CLAUDE_TOOL_INPUT_FILE_PATH"

case "$FILE" in
  *.js|*.jsx)
    npx eslint --fix "$FILE"
    ;;
esac

exit 0
