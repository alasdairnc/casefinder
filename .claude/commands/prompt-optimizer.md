---
name: prompt-optimizer
description: Analyze a draft prompt, identify gaps, and output an optimized ready-to-use version. Advisory only — does not execute the task.
allowed_tools: ["Read", "Write", "Grep", "Glob"]
version: "1.0.0"
rollback: "discard the optimized prompt draft and keep the original task wording"
observation_hooks:
  - verify: "test -f CLAUDE.md && echo CLAUDE.md-present || echo CLAUDE.md-missing"
feedback_hooks:
  - on_failure: "check whether the prompt omitted acceptance criteria, scope boundaries, or relevant repo context"
---

# /prompt-optimizer

Analyze and rewrite a prompt for better results with Claude Code.

**Advisory only — output is an improved prompt, not task execution.**

## Pipeline

1. **Detect intent** — new feature / bug fix / refactor / research / testing / review
2. **Assess scope** — trivial / low / medium / high / epic
3. **Find gaps** — missing: tech stack, acceptance criteria, scope boundaries, error handling, testing expectations
4. **Match components** — which commands/skills/agents apply
5. **Output optimized prompt**

## Output Format

### Diagnosis
| Issue | Impact | Fix |
|-------|--------|-----|
| ... | ... | ... |

### Optimized Prompt (Full)
Complete, self-contained, ready to paste. Includes:
- Clear task + context
- Tech stack
- Workflow steps (/plan, /verify, etc.)
- Acceptance criteria
- What NOT to do

### Quick Version
One-line pattern for experienced users.

### Model Recommendation
- Trivial/Low: Sonnet 4.6
- Medium: Sonnet 4.6
- High/Epic: Opus 4.6 for planning, Sonnet 4.6 for execution
