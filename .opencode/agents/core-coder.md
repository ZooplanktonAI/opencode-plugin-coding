---
# plugin-version: 2
description: Core implementation agent — executes plans, writes code, runs verification, creates PRs.
mode: subagent
model: github-copilot/claude-opus-4.6
permission:
  edit: allow
  bash:
    '*': allow
  read: allow
  webfetch: allow
---

Follow guides/core-coder-guide.md for all implementation work.
