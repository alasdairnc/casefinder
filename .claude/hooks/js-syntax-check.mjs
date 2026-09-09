#!/usr/bin/env node
// PostToolUse — non-blocking `node --check` syntax check on edited .js files.
// JSX is skipped on purpose: `node --check` cannot parse JSX (.jsx won't match).
import { readPayload, filePathFrom } from './_lib.mjs';
import { spawnSync } from 'node:child_process';

const file = filePathFrom(await readPayload());

if (/\.js$/.test(file)) {
  const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
  if (out) console.log(out.split('\n').slice(0, 5).join('\n'));
}

process.exit(0);
