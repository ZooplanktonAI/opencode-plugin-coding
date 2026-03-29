---
name: init
description: Auto-detect project settings and generate workflow.json for the coding plugin.
---

# /init — Project Setup

When the user runs `/init`, perform the following steps to bootstrap the opencode-plugin-coding configuration for this project.

## Step 1: Auto-Detect Project Settings

Read the project root and detect:

### Project identity

```bash
# Get repo name from git remote
REPO=$(git remote get-url origin 2>/dev/null | sed 's/.*[:/]\([^/]*\/[^/]*\)\.git$/\1/' | sed 's/.*[:/]\([^/]*\/[^/]*\)$/\1/')
PROJECT_NAME=$(basename "$(pwd)")
DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main")
```

### Stack detection

1. Read `package.json` if it exists:
   - `language`: "typescript" if `tsconfig.json` exists, else "javascript"
   - `framework`: detect from dependencies — "react-native", "react", "vue", "next", "nuxt", "express", "koa", "electron", etc.
   - `packageManager`: check for `yarn.lock` → "yarn", `pnpm-lock.yaml` → "pnpm", `bun.lockb` → "bun", else "npm"

2. If no `package.json`, check for other project types (Python, Go, Rust, etc.) and set accordingly.

### Command detection

Look at `package.json` scripts and detect:

- `build`: prefer `scripts.build` → `"<pm> build"`, else `""`
- `lint`: prefer `scripts.lint` → `"<pm> lint"`, else check for eslint/stylelint/prettier individually
- `test`: prefer `scripts.test` → `"<pm> test"`, else `""`
- `typecheck`: if TypeScript, prefer `scripts.typecheck` → `"<pm> typecheck"`, else `"npx tsc --noEmit"` if `tsconfig.json` exists

### Agent defaults

Use these defaults (user can adjust later):

```json
{
  "coreCoder": { "name": "core-coder", "model": "github-copilot/claude-opus-4.6" },
  "coreReviewers": [
    { "name": "core-reviewer-primary", "model": "github-copilot/claude-sonnet-4.6" },
    { "name": "core-reviewer-secondary", "model": "github-copilot/gpt-5.4" }
  ],
  "reviewers": [
    { "name": "reviewer-glm", "model": "alibaba-coding-plan-cn/glm-5" },
    { "name": "reviewer-minimax", "model": "alibaba-coding-plan-cn/MiniMax-M2.5" },
    { "name": "reviewer-qwen", "model": "alibaba-coding-plan-cn/qwen3.5-plus" },
    { "name": "reviewer-kimi", "model": "alibaba-coding-plan-cn/kimi-k2.5" },
    { "name": "reviewer-ark", "model": "volcengine-plan/ark-code-latest" },
    { "name": "reviewer-deepseek", "model": "volcengine-plan/deepseek-v3.2" }
  ],
  "securityReviewers": []
}
```

### Docs to read

Detect which docs exist and add them:

```bash
# Check for common doc files
ls AGENTS.md doc/CODE_STYLE.md doc/UPGRADE_PLAN.md doc/Game.md doc/MODERNIZATION_PLAN.md 2>/dev/null
```

Add all found files to the `docsToRead` array.

## Step 2: Generate workflow.json

Create `.opencode/workflow.json` with the detected settings. Use the template structure:

```json
{
  "project": {
    "name": "<detected>",
    "repo": "<detected>",
    "defaultBranch": "<detected>"
  },
  "stack": {
    "language": "<detected>",
    "framework": "<detected>",
    "packageManager": "<detected>"
  },
  "commands": {
    "build": "<detected>",
    "lint": "<detected>",
    "test": "<detected>",
    "typecheck": "<detected>"
  },
  "agents": {
    "coreCoder": { "name": "core-coder", "model": "github-copilot/claude-opus-4.6" },
    "coreReviewers": [
      { "name": "core-reviewer-primary", "model": "github-copilot/claude-sonnet-4.6" },
      { "name": "core-reviewer-secondary", "model": "github-copilot/gpt-5.4" }
    ],
    "reviewers": [
      { "name": "reviewer-glm", "model": "alibaba-coding-plan-cn/glm-5" },
      { "name": "reviewer-minimax", "model": "alibaba-coding-plan-cn/MiniMax-M2.5" },
      { "name": "reviewer-qwen", "model": "alibaba-coding-plan-cn/qwen3.5-plus" },
      { "name": "reviewer-kimi", "model": "alibaba-coding-plan-cn/kimi-k2.5" },
      { "name": "reviewer-ark", "model": "volcengine-plan/ark-code-latest" },
      { "name": "reviewer-deepseek", "model": "volcengine-plan/deepseek-v3.2" }
    ],
    "securityReviewers": []
  },
  "testDrivenDevelopment": { "enabled": false },
  "docsToRead": ["<detected>"],
  "reviewFocus": []
}
```

Create the `.opencode/` directory if it doesn't exist:

```bash
mkdir -p .opencode
```

Write the file. If `.opencode/workflow.json` already exists, warn the user and ask before overwriting.

## Step 3: Update .gitignore

Append these entries to the project's `.gitignore` idempotently (only add lines that are not already present):

```
# opencode-plugin-coding ephemeral files
.opencode/reviewer-knowledge.json
.opencode/plans/
.opencode/retrospectives/
.worktrees/
```

Check each line before appending — do not create duplicates.

## Step 4: Create Required Directories

```bash
mkdir -p .opencode/plans
mkdir -p .opencode/retrospectives
```

## Step 5: Print Summary

After setup, print a summary:

```
## /init Complete

**Project:** <name>
**Repo:** <repo>
**Stack:** <language> / <framework> / <packageManager>

**Commands detected:**
- build: `<command>` (or "not detected")
- lint: `<command>` (or "not detected")
- test: `<command>` (or "not detected")
- typecheck: `<command>` (or "not detected")

**Files created/updated:**
- `.opencode/workflow.json` — project configuration
- `.gitignore` — updated with plugin ignore patterns

**Manual review checklist:**
- [ ] Verify detected commands are correct in `.opencode/workflow.json`
- [ ] Verify reviewer names and model IDs in `agents.coreReviewers` and `agents.reviewers`
- [ ] Add or remove reviewer entries to match your available agent files
- [ ] Add entries to `agents.securityReviewers` if needed
- [ ] Enable `testDrivenDevelopment` if using test-driven development
- [ ] Set `reviewFocus` entries if this project has specific review emphases
- [ ] Review `docsToRead` list and add any project-specific docs
```
