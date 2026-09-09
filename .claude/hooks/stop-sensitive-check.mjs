#!/usr/bin/env node
// Stop hook — warns (does not block) if the session ended with sensitive files modified.
import { execSync } from 'node:child_process';

let files = '';
try {
  files = execSync('git diff --name-only', { encoding: 'utf8' }).trim();
} catch {
  process.exit(0);
}

if (files) {
  const sensitive = files.split('\n').filter((f) => {
    const l = f.toLowerCase();
    return f.includes('.env') || l.includes('secret') || l.includes('credential');
  });
  if (sensitive.length) {
    console.error(`Warning: session ended with potentially sensitive files modified: ${sensitive.join(', ')}`);
  }
}
