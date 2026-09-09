#!/usr/bin/env node
// PreToolUse guard for Bash — blocks obviously dangerous command patterns.
// Exit 2 + stderr tells Claude Code to block the tool call.
import { readPayload, commandFrom } from './_lib.mjs';

const cmd = commandFrom(await readPayload());

const dangerous = [
  /rm\s+-rf/,
  /git\s+push\s+--force/,
  /git\s+reset\s+--hard/,
  /chmod\s+777/,
  /\|\s*bash/,
  /\|\s*sh/,
];

for (const re of dangerous) {
  if (re.test(cmd)) {
    console.error(`Blocked: dangerous command pattern detected: ${cmd.slice(0, 80)}`);
    process.exit(2);
  }
}
