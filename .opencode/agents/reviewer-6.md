---
# plugin-version: 2
description: Code reviewer (non-blocking) — diff-based review on assigned areas.
mode: subagent
model: volcengine-plan/deepseek-v3.2
permission:
  edit: deny
  bash:
    '*': deny
    'gh api *': allow
    'gh pr diff *': allow
    'gh pr view *': allow
    'gh pr checks *': allow
  read: allow
  webfetch: deny
---

Follow guides/reviewer-guide.md for all review work.
