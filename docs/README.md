# Documentation Map

## Core

- `local-setup.md` — Local dev setup for macOS & Windows (one-command `npm run setup`).
- `architecture.md` — System architecture and component boundaries.
- `design-system.md` — UI patterns, tokens, and design conventions.
- `security.md` — Security posture and safeguards.

## Filtering

- `filtering/FILTER_TUNING.md` — Full filter tuning architecture and workflow.
- `filtering/FILTER_TUNING_QUICKSTART.md` — Fast path for running and improving filter quality.

## Operations

- `operations/MODE1_BALANCED_BACKLOG.md` — Backlog and sequencing for Mode 1 work.
- `operations/MODE1_DISCOVERY_RUNBOOK.md` — Discovery execution guide.
- `operations/MODE4_EVALUATION_SNAPSHOT_2026-04-04.md` — Mode 4 evaluation snapshot.
- `operations/MODE5_CANARY_CHECKLIST.md` — Canary rollout checklist.
- `operations/MODE5_CANARY_SNAPSHOT_2026-04-04.md` — Canary status snapshot.
- `operations/PERFORMANCE_PLAN.md` — Performance optimization and monitoring plan.
- `operations/audit-log.md` — Audit findings and remediation history.

## Superpowers

- `superpowers/` — Agent workflow plans and operational notes.

## Generated Artifacts

- `../artifacts/` — Generated reports and temporary run outputs (for example `filter-quality-report.html`).

## Authoring docs & reports

- **Preview:** `npm run docs:preview` — serves `docs/`, `reports/`, `artifacts/`
  with live reload; `.md` renders to styled HTML on the fly.
- **Build:** `npm run docs:build -- <file.md>` — writes standalone HTML to
  `artifacts/html/` (git-ignored).
- **Lint:** `npm run docs:lint` — runs markdownlint over `reports/**` and
  `docs/superpowers/**`. Also runs on staged `.md` in pre-commit. `artifacts/`
  contains generated reports (not hand-authored) and is excluded.
- **Generate:** the `/weekly-report` skill produces a digest in the standard format.
