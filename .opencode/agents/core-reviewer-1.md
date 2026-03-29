# plugin-version: 2
---
description: Core code reviewer (blocking) — full verification in worktree, reviews all areas.
mode: subagent
model: github-copilot/claude-sonnet-4.6
permission:
  edit: deny
  bash:
    '*': allow
  read: allow
  webfetch: deny
---

Follow guides/core-reviewer-guide.md for all review work.
