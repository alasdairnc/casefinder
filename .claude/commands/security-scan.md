---
name: security-scan
description: Run AgentShield security scan on the .claude/ config
allowed_tools: ["Bash", "Read", "Grep", "Glob"]
version: "1.0.0"
rollback: "revert .claude configuration changes that caused new security findings"
observation_hooks:
  - verify: "find .claude -maxdepth 2 -type f | sort"
feedback_hooks:
  - on_failure: "inspect the reported .claude file and tighten permissions, metadata, or command guidance"
---

# /security-scan

Scan Claude Code configuration for vulnerabilities.

AgentShield has no exclude option and walks into `.claude/worktrees/` (live Claude Code worktree checkouts, each with their own `.claude` copies), flagging them as new findings. Always gate against a worktree-free copy — finding paths are relative to the scan root, so the baseline stays valid:

```bash
rsync -a --delete --exclude worktrees .claude/ "$TMPDIR/agentshield-scan/" && \
  npx ecc-agentshield scan -p "$TMPDIR/agentshield-scan" --baseline .claude/agentshield-baseline.json --gate
```

For deep analysis with Opus:

```bash
npx ecc-agentshield scan -p "$TMPDIR/agentshield-scan" --opus --stream
```

Auto-fix safe issues (`--fix` edits files, so it must target the real `.claude` — never let it descend into other sessions' worktrees; review its diff before accepting):

```bash
npx ecc-agentshield scan --fix
```

Target score: 99/100 (100 on active config — remaining finding is the known `chmod +x lint-on-save.sh` false positive, documented in memory). The `--gate` flag fails only on new regressions vs baseline.
