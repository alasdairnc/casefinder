#!/usr/bin/env node
// PreCompact hook — prints a compact git/working-tree snapshot so the summarizer
// retains branch, recent commits, and in-flight changes. Cross-platform (Node only).
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const run = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

const branch = run('git branch --show-current');
const commits = run('git log --oneline -3');
const unstaged = run('git diff --name-only');
const staged = run('git diff --cached --name-only');

let focus = '';
try {
  for (const line of readFileSync('CLAUDE.md', 'utf8').split('\n')) {
    if (line.includes('Current focus') || line.includes('Active Development')) {
      focus = line.trim();
      break;
    }
  }
} catch {
  /* CLAUDE.md is optional */
}

const out = ['--- COMPACTION CONTEXT ---', `Branch: ${branch}`, `Last 3 commits:\n${commits}`];
if (unstaged) out.push(`Unstaged changes: ${unstaged}`);
if (staged) out.push(`Staged changes: ${staged}`);
if (!unstaged && !staged) out.push('Working tree: clean');
if (focus) out.push(`Active focus: ${focus}`);
out.push('--------------------------');
console.log(out.join('\n'));
