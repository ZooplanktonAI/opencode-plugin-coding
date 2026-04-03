---
description: Auto-detect project settings and generate workflow.json for the coding plugin.
---

# /zooplankton-coding-init — Project Setup

When the user runs `/zooplankton-coding-init`, perform the following steps to bootstrap the opencode-plugin-coding configuration for this project.

## Step 1: Auto-Detect Project Settings

Read the project root and detect:

### Project identity

```bash
# Get repo name from git remote
REPO=$(git remote get-url origin 2>/dev/null | sed 's/.*[:/]\([^/]*\/[^/]*\)\.git$/\1/' | sed 's/.*[:/]\([^/]*\/[^/]*\)$/\1/')
PROJECT_NAME=$(basename "$(pwd)")
DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "master")
```

### Platform detection

Determine whether this project should use `github` or `local` mode:

1. **Check the git remote URL** (from `git remote get-url origin`):
   - If the URL matches a GitHub pattern — SSH (`git@github.com:Org/repo.git`) or HTTPS (`https://github.com/Org/repo.git`) — set `platform` to `"github"`
   - If the URL is a non-GitHub remote (e.g., GitLab, Bitbucket, self-hosted) — set `platform` to `"local"`
   - If no remote exists (`git remote get-url origin` fails) — set `platform` to `"local"`
   - **Note:** GitHub Enterprise instances with custom domains (not `github.com`) will auto-detect as `local`. Users should set `platform: "github"` manually in `workflow.json` if they want the full GitHub API workflow.
   - **Note:** Local mode still requires a git remote named `origin` for the orchestrate workflow (`git fetch`, `git push`). If no remote exists, the user must add one before running orchestrate (e.g., `git remote add origin <url>`).
   - **Note:** Local mode requires a git remote named `origin` for the orchestrate workflow (`git fetch`, `git push`). If no remote exists yet, the user must add one (`git remote add origin <url>`) before running the orchestrate skill, or orchestration commands that reference `origin` will fail.
2. **Manual override:** The user can always change `project.platform` in `workflow.json` after init. Document this in the summary output.

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

### Docs to read

Detect which docs exist and add them:

```bash
# Check for common doc files
ls AGENTS.md doc/CODE_STYLE.md doc/UPGRADE_PLAN.md doc/Game.md doc/MODERNIZATION_PLAN.md 2>/dev/null
```

Add all found files to the `docsToRead` array.

## Step 2: Generate workflow.json

Create `.opencode/workflow.json` with the detected settings. The `agents` section uses `{ name, model }` objects — the plugin reads these to dynamically register agents with the correct model, permissions, and prompt.

```json
{
  "project": {
    "name": "<detected>",
    "repo": "<detected>",
    "defaultBranch": "<detected>",
    "platform": "<detected — 'github' or 'local'>"
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
      { "name": "reviewer-minimax", "model": "minimax-cn-coding-plan/MiniMax-M2.7" },
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

**How agents work:** The plugin JS reads `workflow.json` at startup and dynamically registers each agent via OpenCode's `config.agent` API, using the guide files (`guides/*.md`) as prompts and the role-appropriate permissions. No `.opencode/agents/*.md` files are needed in consumer projects — the plugin handles everything.

## Step 2b: Generate workflow-local.json

Create `.opencode/workflow-local.json` for user-specific settings (gitignored, not committed). This file stores the user's GitHub account mapping so concurrent agents don't conflict.

Ask the user which GitHub accounts they use for coding (commits, PRs) and reviewing (PR comments). List available accounts with `gh auth status` to help them choose.

```json
{
  "github": {
    "account": {
      "default": "<primary GitHub account>",
      "coreCoder": "",
      "coreReviewer": "",
      "reviewer": "",
      "securityReviewer": ""
    }
  }
}
```

- `default` applies to all agent roles unless overridden by a specific key
- `coreCoder` overrides for the core implementation agent
- `coreReviewer` overrides for core reviewers (worktree-based, blocking)
- `reviewer` overrides for normal reviewers (diff-based, non-blocking)
- `securityReviewer` overrides for security reviewers

Leave per-role keys empty to inherit from `default`. Resolution: per-role > default > none.

If `.opencode/workflow-local.json` already exists, warn the user and ask before overwriting.

## Step 3: Update .gitignore

Append these entries to the project's `.gitignore` idempotently (only add lines that are not already present):

```
# opencode-plugin-coding ephemeral files
.opencode/workflow-local.json
.opencode/reviewer-knowledge.json
.opencode/plans/
.opencode/retrospectives/
.opencode/designs/
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
## /zooplankton-coding-init Complete

**Project:** <name>
**Repo:** <repo>
**Platform:** <platform> (auto-detected — override in workflow.json → project.platform if needed)
**Stack:** <language> / <framework> / <packageManager>

**Commands detected:**
- build: `<command>` (or "not detected")
- lint: `<command>` (or "not detected")
- test: `<command>` (or "not detected")
- typecheck: `<command>` (or "not detected")

**Agents configured (via workflow.json):**
- Core coder: `core-coder` → `github-copilot/claude-opus-4.6`
- Core reviewers: `core-reviewer-primary`, `core-reviewer-secondary`
- Normal reviewers: `reviewer-glm`, `reviewer-minimax`, `reviewer-qwen`, `reviewer-kimi`, `reviewer-ark`, `reviewer-deepseek`
- Security reviewers: (none — add to workflow.json to enable)

**Files created/updated:**
- `.opencode/workflow.json` — project configuration
- `.opencode/workflow-local.json` — user-specific GitHub account mapping (gitignored)
- `.gitignore` — updated with plugin ignore patterns

**Manual review checklist:**
- [ ] Verify detected commands are correct in `.opencode/workflow.json`
- [ ] Verify `project.platform` is correct (`github` or `local`). Override if auto-detection was wrong.
- [ ] Review model assignments in `workflow.json` → `agents` section
- [ ] Add or remove agents and adjust model IDs as needed
- [ ] Add entries to `agents.securityReviewers` if security review is needed
- [ ] Enable `testDrivenDevelopment` if using test-driven development
- [ ] Set `reviewFocus` entries if this project has specific review emphases
- [ ] Review `docsToRead` list and add any project-specific docs
- [ ] Verify GitHub accounts in `workflow-local.json` match your `gh auth status`

> **Note:** Agents are registered dynamically by the plugin from workflow.json — no agent `.md` files needed. To change models or add/remove agents, just edit `workflow.json` and restart OpenCode.
```
