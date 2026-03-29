---
description: Auto-detect project settings, generate workflow.json, and create agent files for the coding plugin.
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

Create `.opencode/workflow.json` with the detected settings:

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
    "coreCoder": "core-coder",
    "coreReviewers": ["core-reviewer-1", "core-reviewer-2"],
    "reviewers": ["reviewer-1", "reviewer-2", "reviewer-3", "reviewer-4", "reviewer-5", "reviewer-6"],
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

## Step 3: Generate Agent Files

Create `.opencode/agents/` directory and generate a markdown agent file for each agent listed in `workflow.json`. Each agent name in workflow.json corresponds to a `.opencode/agents/<name>.md` file.

If `.opencode/agents/` already has files, warn the user and ask before overwriting existing agent files.

### Template-based generation

Agent files are generated from 4 templates in `templates/agents/`. Each template has a `$MODEL` placeholder that is replaced with the assigned model ID.

| Agent category | Template file | workflow.json field |
|----------------|---------------|---------------------|
| Core coder | `templates/agents/core-coder.md` | `agents.coreCoder` |
| Core reviewer | `templates/agents/core-reviewer.md` | `agents.coreReviewers` |
| Normal reviewer | `templates/agents/reviewer.md` | `agents.reviewers` |
| Security reviewer | `templates/agents/security-reviewer.md` | `agents.securityReviewers` |

### Generation procedure

For each agent name in workflow.json:

1. Determine the template based on which field the name belongs to
2. Read the template file content
3. Replace `$MODEL` with the default model for that agent (see defaults below)
4. Write the result to `.opencode/agents/<name>.md`

### Default model assignments

**Core coder:**

| Agent name | Default model |
|------------|---------------|
| `core-coder` | `github-copilot/claude-opus-4.6` |

**Core reviewers (in order):**

| Agent name | Default model |
|------------|---------------|
| `core-reviewer-1` | `github-copilot/claude-sonnet-4.6` |
| `core-reviewer-2` | `github-copilot/gpt-5.4` |

**Normal reviewers (in order):**

| Agent name | Default model |
|------------|---------------|
| `reviewer-1` | `alibaba-coding-plan-cn/glm-5` |
| `reviewer-2` | `alibaba-coding-plan-cn/MiniMax-M2.5` |
| `reviewer-3` | `alibaba-coding-plan-cn/qwen3.5-plus` |
| `reviewer-4` | `alibaba-coding-plan-cn/kimi-k2.5` |
| `reviewer-5` | `volcengine-plan/ark-code-latest` |
| `reviewer-6` | `volcengine-plan/deepseek-v3.2` |

**Security reviewers (in order):**

| Agent name | Default model |
|------------|---------------|
| `security-reviewer-1` | `alibaba-coding-plan-cn/glm-5` |

If the user adds more agents than there are default models, prompt them to specify a model for the extra agents.

## Step 4: Update .gitignore

Append these entries to the project's `.gitignore` idempotently (only add lines that are not already present):

```
# opencode-plugin-coding ephemeral files
.opencode/reviewer-knowledge.json
.opencode/plans/
.opencode/retrospectives/
.opencode/designs/
.worktrees/
```

Check each line before appending — do not create duplicates.

## Step 5: Create Required Directories

```bash
mkdir -p .opencode/plans
mkdir -p .opencode/retrospectives
mkdir -p .opencode/agents
```

## Step 6: Print Summary

After setup, print a summary:

```
## /zooplankton-coding-init Complete

**Project:** <name>
**Repo:** <repo>
**Stack:** <language> / <framework> / <packageManager>

**Commands detected:**
- build: `<command>` (or "not detected")
- lint: `<command>` (or "not detected")
- test: `<command>` (or "not detected")
- typecheck: `<command>` (or "not detected")

**Agent files created:**
- `.opencode/agents/core-coder.md`
- `.opencode/agents/core-reviewer-1.md`
- `.opencode/agents/core-reviewer-2.md`
- `.opencode/agents/reviewer-1.md` ... `reviewer-6.md`

**Other files created/updated:**
- `.opencode/workflow.json` — project configuration
- `.gitignore` — updated with plugin ignore patterns

**Manual review checklist:**
- [ ] Verify detected commands are correct in `.opencode/workflow.json`
- [ ] Review model assignments in `.opencode/agents/*.md` files
- [ ] Add or remove agent files and update `workflow.json` agent lists accordingly
- [ ] Add entries to `agents.securityReviewers` and create agent files if needed
- [ ] Enable `testDrivenDevelopment` if using test-driven development
- [ ] Set `reviewFocus` entries if this project has specific review emphases
- [ ] Review `docsToRead` list and add any project-specific docs

> **Tip:** When the plugin is updated, run `/zooplankton-coding-update` to sync agent file templates while preserving your model assignments.
```
