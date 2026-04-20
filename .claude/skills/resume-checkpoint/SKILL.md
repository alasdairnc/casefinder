---
name: resume-checkpoint
description: Checkpoint progress mid-session so usage-limit interruptions become a clean pause instead of a reset. Commits WIP, writes a resumption note, and prints the next step. Use before long tasks or when a session is at risk of hitting limits.
---

# Resume Checkpoint

Invoke with `/resume-checkpoint`. Commits any in-progress work and writes a resumption file so the next session can pick up exactly where this one left off.

## Steps

1. **Capture current state**:

   ```bash
   git status --short
   git diff --stat
   ```

2. **Stage and commit WIP** (only files already modified — do not stage unrelated files):

   ```bash
   git add -p   # stage relevant hunks interactively if needed
   git commit -m "chore: WIP checkpoint — [brief description of what's in progress]"
   ```

   Skip if there's nothing to commit.

3. **Write PROGRESS.md** to the repo root (overwrite if exists):

   ```
   # Session Checkpoint — [date]

   ## Status
   [What is done / what is partially done]

   ## Next Step
   [Exact next action — be specific enough that a cold session can resume without reading the full conversation]

   ## Blockers
   [Anything that was stuck or unresolved]

   ## Open Files / Context
   [File paths that were being actively edited]
   ```

4. **Print resumption prompt** — a single line the user can paste into the next session:

   ```
   Resume from PROGRESS.md: [one-sentence summary of next step]
   ```

## Constraints

- Never stage `.env` or credential files
- Keep the commit message honest — "WIP checkpoint" is fine; don't fake a clean commit message
- PROGRESS.md is ephemeral — delete it once the work it describes is fully committed
