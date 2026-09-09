#!/usr/bin/env node
// PostToolUse — runs eslint --fix on edited .js/.jsx files. Never blocks (exit 0).
// Invokes eslint via the Node binary directly (no npx / .cmd) so it is fully
// cross-platform, and skips silently if eslint is not installed locally.
import { readPayload, filePathFrom } from './_lib.mjs';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const file = filePathFrom(await readPayload());
const eslintBin = 'node_modules/eslint/bin/eslint.js';

if (/\.(js|jsx)$/.test(file) && existsSync(eslintBin)) {
  const r = spawnSync(process.execPath, [eslintBin, '--fix', file], { encoding: 'utf8' });
  const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
  if (out) console.log(out.split('\n').slice(0, 20).join('\n'));
}

process.exit(0);
