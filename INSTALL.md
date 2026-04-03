# Installation Guide

How to install and use `opencode-plugin-coding` in your project.

---

## Prerequisites

- [OpenCode](https://opencode.ai) installed and working
- A git repo (GitHub or local)

---

## Step 1: Add the plugin

Create or edit `opencode.json` in your project root:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "opencode-plugin-coding"
  ]
}
```

OpenCode installs the plugin automatically from npm via Bun on startup. No symlinks, no manual copies.

To pin a specific version: `"opencode-plugin-coding@0.1.5"`.

### Global installation (optional)

To make the plugin available in all projects, add the same `plugin` entry to `~/.config/opencode/opencode.json` instead of per-project.

---

## Step 2: Initialize the project

Start OpenCode in your project root and run:

```
/zooplankton-coding-init
```

This auto-detects your project and generates `.opencode/workflow.json`:

- **Project identity** — repo name, default branch (from git remote)
- **Stack** — language, framework, package manager (from `package.json` / lock files)
- **Commands** — build, lint, test, typecheck (from `package.json` scripts)
- **Agents** — default set of core-coder, core-reviewers, and normal reviewers
- **`.gitignore`** — appends ignore patterns for ephemeral plugin files

After init, review the output and verify detected settings.

---

## Step 3: Configure workflow.json

Open `.opencode/workflow.json` and review/adjust:

### Commands

```json
"commands": {
  "build": "yarn build",
  "lint": "yarn lint",
  "test": "yarn test",
  "typecheck": "npx tsc --noEmit"
}
```

Set any unconfigured command to `""` (empty string). Core reviewers will report it as `N/A` in their verification table.

### Agents

Each agent is a `{ name, model }` object. The plugin dynamically registers agents from this section — no `.opencode/agents/*.md` files needed.

```json
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
}
```

**Agent roles:**

| Role | Count | Behavior |
|------|-------|----------|
| `coreCoder` | 1 | Implements code in a worktree, creates PRs, addresses review feedback |
| `coreReviewers` | 2+ | Blocking quorum — checkout worktree, run all verification, review all areas |
| `reviewers` | 1–6+ | Non-blocking — diff-based review on assigned focus areas via GitHub API |
| `securityReviewers` | 0+ | Pre-merge security gate — runs after code review converges, can block merge |

To add/remove agents or change models, edit this section and restart OpenCode.

### Review focus

Add project-specific review emphases as short labels. Reviewers use these as an additional lens alongside their assigned canonical areas (logic, types, architecture, error handling, tests, docs). Keep entries concise — detailed rules should live in `AGENTS.md` or `docsToRead` files, not here.

```json
"reviewFocus": ["type safety", "error handling", "game balance"]
```

### Docs to read

List files that all agents should read before starting work:

```json
"docsToRead": ["AGENTS.md", "doc/ARCHITECTURE.md"]
```

### Test-driven development

Enable to activate the RED-GREEN-REFACTOR skill:

```json
"testDrivenDevelopment": { "enabled": true }
```

---

## Step 4: Create worktrees

The orchestrate skill uses git worktrees for the core-coder and core-reviewers. These are created automatically on first orchestration, but you can create them upfront:

```bash
git worktree add --detach .worktrees/core-coder
git worktree add --detach .worktrees/core-reviewer-primary
git worktree add --detach .worktrees/core-reviewer-secondary
```

The `/zooplankton-coding-init` command adds `.worktrees/` to `.gitignore`.

---

## Usage

### Full orchestration workflow

Tell the primary agent to implement something. The `orchestrate` skill activates automatically for coding tasks:

```
Implement feature X as described in issue #123.
```

The orchestrator will:

1. **Plan** — invoke core-coder to produce a structured plan; present for approval
2. **Implement** — core-coder works in worktree, commits, pushes, creates PR
3. **Review** — all reviewers run in parallel (core reviewers block, normal reviewers are non-blocking)
4. **Evaluate** — address blocking issues (up to 3 rounds), then run security gate if configured
5. **Merge** — post pre-merge summary, ask for user approval, squash-merge
6. **Retrospect** — write retrospective, update reviewer scores, propose AGENTS.md changes

### Individual skills

You can also use skills directly:

| Skill | When to use |
|-------|-------------|
| `brainstorm` | Refine a rough idea into a validated design |
| `plan` | Break a design into implementation tasks |
| `orchestrate` | Full implement-review-merge cycle |
| `test-driven-development` | Write tests first, then implement |
| `systematic-debugging` | Methodical bug investigation |
| `git-worktree` | Manage worktrees manually |
| `playwright` | Browser automation (requires Playwright MCP server) |

### Commands

| Command | Purpose |
|---------|---------|
| `/zooplankton-coding-init` | First-time project setup |
| `/zooplankton-coding-update` | Check for workflow.json schema updates after plugin upgrades |

---

## What gets created in your project

| Path | Committed? | Purpose |
|------|-----------|---------|
| `opencode.json` | Yes | Plugin registration |
| `.opencode/workflow.json` | Yes | Project config + agent definitions |
| `.opencode/reviewer-knowledge.json` | No | Adaptive reviewer scoring (resets on fresh clone) |
| `.opencode/plans/*.md` | No | Ephemeral plan files (auto-cleaned after 7 days) |
| `.opencode/retrospectives/*.md` | No | Ephemeral retrospective files (auto-cleaned after 7 days) |
| `.worktrees/` | No | Git worktrees for core-coder and core-reviewers |

---

## How it works

The plugin uses OpenCode's `config` hook to register everything dynamically at startup:

1. **Skills** — added to `config.skills.paths` for automatic discovery
2. **Commands** — registered into `config.command` from `commands/*.md`
3. **Agents** — registered into `config.agent` by reading `workflow.json` + platform-specific guide files (`guides/*-github.md` or `guides/*-local.md`)

Agent prompts come from the guide files bundled in the plugin. Permissions are hardcoded per role:

| Role | edit | bash | read | webfetch |
|------|------|------|------|----------|
| core-coder | allow | all | allow | allow |
| core-reviewer | deny | all | allow | deny |
| normal reviewer | deny | `gh`/`git` allowlist | allow | deny |
| security reviewer | deny | `gh`/`git` allowlist | allow | deny |

Normal/security reviewers can run: `gh api *`, `gh pr diff *`, `gh pr view *`, `gh pr checks *`, `git diff *`, `git log *`, `git fetch *`.

---

## Local Mode (Non-GitHub Repos)

The plugin supports a `local` platform mode for repos that don't use GitHub (or where you prefer git-only workflows without PRs).

### How platform is determined

1. The `/zooplankton-coding-init` command auto-detects: GitHub remote → `"github"`, otherwise → `"local"`
2. You can override manually in `workflow.json` → `project.platform`

### What's different in local mode

| Feature | GitHub mode | Local mode |
|---------|-------------|------------|
| Code delivery | PR via `gh pr create` | Branch push via `git push` |
| Review comments | Posted to PR via GitHub API | Returned as structured text in task results |
| Merge | `gh pr merge --squash` | `git merge --no-ff` |
| Security review | Posts verdict to PR | Returns verdict as text |
| Pre-merge summary | Posted as PR comment | Printed to stdout |
| `gh` CLI required | Yes | No |

### Example local-mode `workflow.json`

```json
{
  "project": {
    "name": "my-local-project",
    "repo": "",
    "defaultBranch": "master",
    "platform": "local"
  },
  "stack": { ... },
  "commands": { ... },
  "agents": { ... }
}
```

### What works the same

- All skills (brainstorm, plan, orchestrate, TDD, debugging)
- Agent registration and permissions
- Worktree management for core-coder and core-reviewers
- Reviewer scoring and knowledge file
- Plan/retrospective lifecycle

---

## Updating the plugin

When the plugin is updated, bump the version in `opencode.json` or use `"opencode-plugin-coding"` (without a version) to always get the latest. OpenCode pulls the latest on next startup. Run `/zooplankton-coding-update` to check if your `workflow.json` needs schema changes.

Guide file changes take effect immediately — they're loaded from the plugin, not copied to your project.

---

## Troubleshooting

**Plugin not loading:**
- Verify `opencode.json` has the correct `plugin` entry (e.g., `"opencode-plugin-coding"`)
- Run `npm view opencode-plugin-coding` to confirm the package is accessible
- Restart OpenCode after changing `opencode.json`

**Agents not appearing:**
- Verify `.opencode/workflow.json` exists and has a valid `agents` section
- Each agent needs a `name` field; `model` is optional (if omitted, the agent inherits the default model)
- Restart OpenCode after editing `workflow.json`

**Worktree errors:**
- Run `git worktree list` to check existing worktrees
- Remove stale worktrees: `git worktree remove .worktrees/<name>`
- Recreate: `git worktree add --detach .worktrees/<name>`

**Reviewer posting failures (wrong line numbers):**
- Reviewers are instructed to validate line numbers against the diff before posting
- If a reviewer consistently fails, check if the model supports the `gh pr diff` output format
- The orchestrator retries failed reviewer tasks once before marking as no result
