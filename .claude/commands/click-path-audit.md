---
name: click-path-audit
description: Trace every button/interactive element through full state change sequence to find bugs where functions cancel each other out or leave UI in wrong state
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
version: "1.0.0"
rollback: "remove click-path findings notes and revert any follow-up debug edits"
observation_hooks:
  - verify: "rg -n \"onClick|onSubmit|onChange|useEffect|set[A-Z]\" src/components src/hooks src/lib"
feedback_hooks:
  - on_failure: "retrace the handler order and check for later state resets or effect interference"
---

# /click-path-audit

Use when users report broken buttons or after any refactor touching shared state.

## Step 1: Map state stores

For each React context/state in scope:
- What fields does each setter write?
- Does it RESET other fields as a side effect?

Document: `actionName → { sets: [...], resets: [...] }`

Flag DANGEROUS RESETS — setters that clear state they don't own.

## Step 2: Audit each touchpoint

For every button/form/toggle:
```
TOUCHPOINT: [label] in [Component:line]
  HANDLER: onClick → {
    call 1: fn() → sets {X: true}
    call 2: fn() → sets {Y} RESETS {X: false}  ← CONFLICT
  }
  EXPECTED: [what button label promises]
  ACTUAL: [what actually happens]
  VERDICT: BUG or OK
```

Check these patterns:
- **Sequential Undo** — call B resets what call A just set
- **Async Race** — two fetches, wrong one resolves last
- **Stale Closure** — captured stale state value
- **Dead Path** — conditional is always false at that point
- **useEffect Interference** — effect resets state right after button sets it

## Step 3: Report

```
CLICK-PATH-NNN: [CRITICAL/HIGH/MEDIUM/LOW]
  Touchpoint: [label] in [file:line]
  Pattern: [pattern name]
  Trace: call sequence with conflict highlighted
  Fix: [specific fix]
```
