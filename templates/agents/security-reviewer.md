# plugin-version: 2
---
description: Security reviewer — pre-merge security analysis.
mode: subagent
model: $MODEL
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

Follow guides/security-reviewer-guide.md for all review work.
