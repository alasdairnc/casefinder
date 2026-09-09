#!/usr/bin/env node
// PreToolUse guard for Write|Edit|MultiEdit — blocks edits to protected files.
// Exit 2 + stderr tells Claude Code to block the tool call.
import { readPayload, filePathFrom } from './_lib.mjs';

const payload = await readPayload();
const path = filePathFrom(payload);
const filename = path.split('/').pop() || '';

const block = (msg) => {
  console.error(`Blocked: ${msg}`);
  process.exit(2);
};

if (path.includes('node_modules')) {
  block('do not write into node_modules.');
}
if (/^\.env(\.|$)/.test(filename)) {
  block('.env files must not be edited via Claude. Edit manually or use "vercel env".');
}
if (filename === 'vercel.json') {
  block('vercel.json controls CORS and routing. Edit manually and confirm changes.');
}
if (filename === 'package-lock.json') {
  block('package-lock.json is auto-generated. Run npm install instead.');
}
