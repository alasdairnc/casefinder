# Local Development Setup (macOS & Windows)

CaseDive runs the same way on macOS, Windows, and Linux. The Claude Code hooks
and the setup script are written in **Node** (the project's own runtime), so there
is no dependency on `python3`, `sh`, or any other Unix-only tool.

## Prerequisites

| Tool | Needed for | macOS | Windows |
| --- | --- | --- | --- |
| Node.js 20+ | everything | `brew install node` or `nvm install` (see `.nvmrc`) | <https://nodejs.org> or `winget install OpenJS.NodeJS.LTS` |
| Git | everything | preinstalled / `brew install git` | <https://git-scm.com> (bundles Git Bash) |
| gitleaks | `npm run security:scan`, pre-commit hook | `brew install gitleaks` | `winget install gitleaks` or `scoop install gitleaks` |
| Vercel CLI | `npm run dev:api` (full stack) | `npm i -g vercel` | `npm i -g vercel` |

## Quick start

```bash
git clone <repo-url> && cd casedive
npm install
npm run setup
```

`npm run setup` (cross-platform — runs `scripts/setup.mjs`) will:

1. Copy `.env.example` → `.env` if it doesn't exist
2. Run `npm install`
3. Activate the repo git hooks (`git config core.hooksPath .githooks`)
4. Install the Playwright browsers (chromium, webkit)
5. Check for `gitleaks` and the Vercel CLI and tell you how to install any that are missing

Preview the steps without changing anything:

```bash
npm run setup -- --dry-run
```

### OS convenience wrappers (optional)

Both just call `scripts/setup.mjs`; `npm run setup` is equivalent on every OS.

- **Windows:** `powershell -ExecutionPolicy Bypass -File scripts\setup.ps1`
- **macOS / Linux:** `bash scripts/setup.sh`

## Environment variables

Edit the `.env` created by setup:

- `ANTHROPIC_API_KEY` — **required**, from <https://console.anthropic.com/>
- `CANLII_API_KEY` — optional, from <https://www.canlii.org/en/tools/api.html>

`.env` is git-ignored — never commit it.

## Common commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Frontend only (Vite) |
| `npm run dev:api` | Full stack — frontend + `/api/` (needs Vercel CLI) |
| `npm run build` | Production build |
| `npm run test:unit` | Unit tests (excludes `.test.jsx`) |
| `npm run test:component` | Component tests (`.test.jsx`) |
| `npm test` | Playwright E2E (start `npm run dev:api` first) |
| `npm run test:guardrails` | Pre-PR: sanitizer + retrieval-failures + filter |
| `npm run security:scan` | gitleaks scan (run before pushing) |

## Claude Code hooks

The hooks in `.claude/settings.json` run through `node .claude/hooks/*.mjs`, so they
behave identically on macOS, Windows, and CI. No extra setup is needed beyond having
Node on your PATH. Hook scripts:

- `block-protected-writes.mjs` / `block-dangerous-bash.mjs` — PreToolUse guards
- `lint-on-save.mjs` / `js-syntax-check.mjs` / `post-edit-reviews.mjs` — PostToolUse checks
- `precompact-context.mjs` — PreCompact git snapshot
- `stop-sensitive-check.mjs` — Stop-time sensitive-file warning

## Windows notes

- **Git hooks:** Git for Windows ships Git Bash, which runs the `.githooks/pre-commit`
  and `pre-push` shell hooks. Make sure `gitleaks` is on your PATH or the pre-commit
  hook will block the commit.
- **PowerShell execution policy:** if `setup.ps1` is blocked, run it with
  `powershell -ExecutionPolicy Bypass -File scripts\setup.ps1` — this bypasses the
  policy for that one invocation only, no permanent change required.
- **Line endings:** the repo's shell scripts and hooks use LF. If you see
  `bad interpreter` errors, ensure Git isn't converting them to CRLF (the default
  `core.autocrlf=true` on Windows leaves committed LF files alone on checkout for
  these, but configure `* text=auto eol=lf` via `.gitattributes` if needed).
