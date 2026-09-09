#!/usr/bin/env node
/**
 * Cross-platform local dev setup for CaseDive (macOS, Windows, Linux).
 *
 *   npm run setup              # full setup
 *   npm run setup -- --dry-run # preview the steps, change nothing
 *
 * Steps: create .env, install deps, activate git hooks, install Playwright
 * browsers, and report on optional tooling (gitleaks, Vercel CLI).
 */
import { execSync } from 'node:child_process';
import { existsSync, copyFileSync } from 'node:fs';

const DRY = process.argv.includes('--dry-run');
const isWin = process.platform === 'win32';
let failures = 0;

const log = (m) => console.log(m);
const step = (m) => console.log(`\n▶ ${m}`);
const ok = (m) => console.log(`  ✓ ${m}`);
const warn = (m) => console.log(`  ⚠ ${m}`);
const fail = (m) => {
  console.log(`  ✗ ${m}`);
  failures++;
};

function sh(cmd, { optional = false } = {}) {
  if (DRY) {
    log(`  [dry-run] ${cmd}`);
    return true;
  }
  try {
    execSync(cmd, { stdio: 'inherit' });
    return true;
  } catch {
    (optional ? warn : fail)(`command failed: ${cmd}`);
    return false;
  }
}

function has(bin) {
  const probe = isWin ? `where ${bin}` : `command -v ${bin}`;
  try {
    execSync(probe, { stdio: 'ignore', shell: isWin ? undefined : '/bin/sh' });
    return true;
  } catch {
    return false;
  }
}

log(`CaseDive setup — platform: ${process.platform}, node: ${process.version}`);
if (DRY) log('(dry-run: no changes will be made)');

// 1. Node version sanity
step('Checking Node.js version');
const major = Number(process.versions.node.split('.')[0]);
if (major >= 20) ok(`Node ${process.version}`);
else warn(`Node ${process.version} detected; CaseDive targets Node >= 20. Consider upgrading (see .nvmrc).`);

// 2. .env
step('Environment file (.env)');
if (existsSync('.env')) {
  ok('.env already exists — leaving it untouched');
} else if (existsSync('.env.example')) {
  if (DRY) log('  [dry-run] copy .env.example -> .env');
  else {
    copyFileSync('.env.example', '.env');
    ok('created .env from .env.example — fill in ANTHROPIC_API_KEY');
  }
} else {
  warn('.env.example not found; skipping');
}

// 3. Install dependencies
step('Installing npm dependencies (npm install)');
sh('npm install');

// 4. Git hooks
step('Activating repo git hooks (.githooks)');
if (sh('git config core.hooksPath .githooks') && !DRY) ok('core.hooksPath -> .githooks');

// 5. Playwright browsers (optional — large download, needs network)
step('Installing Playwright browsers (chromium, webkit)');
sh('npx --no-install playwright install chromium webkit', { optional: true });

// 6. Optional tooling
step('Optional tooling');
if (has('gitleaks')) {
  ok('gitleaks found (npm run security:scan + pre-commit hook will work)');
} else {
  warn('gitleaks not found — needed for `npm run security:scan` and the pre-commit hook.');
  log('     macOS:   brew install gitleaks');
  log('     Windows: winget install gitleaks   (or: scoop install gitleaks)');
}
if (has('vercel')) {
  ok('vercel CLI found (npm run dev:api will work)');
} else {
  warn('vercel CLI not found — needed for `npm run dev:api` (full stack). Install: npm i -g vercel');
}

// Summary
log('\n' + '─'.repeat(52));
if (failures) {
  log(`Setup finished with ${failures} error(s) — review the ✗ lines above, then re-run \`npm run setup\`.`);
  process.exitCode = 1;
} else if (DRY) {
  log('Dry run complete. Re-run without --dry-run to apply.');
} else {
  log('Setup complete. Next steps:');
  log('  1. Add your ANTHROPIC_API_KEY to .env');
  log('  2. Frontend only:  npm run dev');
  log('  3. Full stack:     npm run dev:api   (needs vercel CLI)');
  log('  4. Run tests:      npm run test:unit');
}
