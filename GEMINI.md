# GEMINI.md — CaseDive Project Bridge

This file provides Gemini CLI-specific instructions for working within the CaseDive ecosystem. **`CLAUDE.md` remains the master source of truth and architectural mandate for this repository.**

## 1. Primary Mandate

As Gemini CLI, I am a guest in this Claude-optimized codebase. I must strictly adhere to the rules, patterns, and workflows defined in:

1. **`CLAUDE.md`** (Architecture, design tokens, and distilled rules)
2. **`skills/`** (Domain-specific legal data and API logic)
3. **`.claude/`** (Agent configurations and custom commands)

## 2. Skills System (Claude-First)

The CaseDive Skills system is the primary way to execute complex tasks. I will treat the instructions in `skills/*.md` as expert procedural guidance that overrides my default behaviors.

### Required Skills Reading

| Task                | Primary Source (Master)                      |
| :------------------ | :------------------------------------------- |
| Criminal Code Edits | `skills/criminal-code-builder-SKILL.md`      |
| CanLII API Logic    | `skills/canlii-case-verification-SKILL.md`   |
| Prompt Engineering  | `skills/canlii-prompt-engineering-SKILL.md`  |
| Civil Law / Charter | `skills/civil-law-database-builder-SKILL.md` |

## 3. Architecture Rules (from CLAUDE.md)

- **Secrets:** Server-side only (`/api/`).
- **Styling:** Inline styles via `ThemeContext` only. No CSS frameworks.
- **Verification:** Every citation must be verified via `/api/verify.js`.
- **Citations:** Use neutral citation format (`YYYY COURT #`) exclusively.

## 4. Operational Alignment

- **Research:** Use `grep_search` to map the codebase as per `CLAUDE.md`'s file structure.
- **Validation:** Run the project's verification tools (e.g., `/verify`, Playwright) after every change.
- **Commits:** Follow the `conventional` commit style as noted in `.claude/rules/`.
