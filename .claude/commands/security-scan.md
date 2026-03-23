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

```bash
npx ecc-agentshield scan
```

For deep analysis with Opus:
```bash
npx ecc-agentshield scan --opus --stream
```

Auto-fix safe issues:
```bash
npx ecc-agentshield scan --fix
```

Target score: 100/100. Fix any findings before pushing.
