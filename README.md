# opencode-plugin-coding

A shared [OpenCode](https://opencode.ai) plugin for multi-agent software development workflows. Provides skills, guides, and dynamically registered agents that standardize the full cycle: brainstorm, plan, implement, review, debug, and retrospect.

## Skills

| Skill | Description |
|-------|-------------|
| `brainstorm` | Socratic design interview that refines rough ideas into a validated design document |
| `plan` | Decomposes a design into bite-sized implementation tasks with file paths and acceptance criteria |
| `orchestrate` | Full multi-agent workflow: implement → review → merge → retrospective |
| `test-driven-development` | RED-GREEN-REFACTOR cycle enforcement |
| `systematic-debugging` | 4-phase debugging: reproduce → hypothesize → isolate → fix |
| `git-worktree` | Create and manage isolated git worktrees for parallel development |
| `playwright` | Browser automation via Playwright MCP server |

## Commands

| Command | Description |
|---------|-------------|
| `/zooplankton-coding-init` | Auto-detect project, generate `workflow.json` |
| `/zooplankton-coding-update` | Check workflow.json schema updates, show plugin changes |

## Guides

Guide files define the prompt and behavior for each agent role. The plugin loads them automatically — they are not installed in consumer projects.

Each guide file at the original path is a **dispatcher** that loads the correct platform variant (`-github.md` or `-local.md`) based on `project.platform` in `workflow.json`.

- `guides/core-coder-guide.md` — Dispatcher for core coder instructions
- `guides/core-reviewer-guide.md` — Dispatcher for core reviewer instructions
- `guides/reviewer-guide.md` — Dispatcher for normal reviewer instructions
- `guides/security-reviewer-guide.md` — Dispatcher for security reviewer instructions

### Platform variants

| Guide | GitHub variant | Local variant |
|-------|---------------|---------------|
| Core coder | `core-coder-guide-github.md` | `core-coder-guide-local.md` |
| Core reviewer | `core-reviewer-guide-github.md` | `core-reviewer-guide-local.md` |
| Normal reviewer | `reviewer-guide-github.md` | `reviewer-guide-local.md` |
| Security reviewer | `security-reviewer-guide-github.md` | `security-reviewer-guide-local.md` |

## Setup

### 1. Install the plugin

Add the plugin to your project's `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "opencode-plugin-coding"
  ]
}
```

OpenCode will auto-install the plugin from npm via Bun at startup. The plugin registers all skills, commands, and agents automatically — no symlinks, manual copies, or `.opencode/agents/*.md` files needed.

### Pin a specific version (optional)

```json
"plugin": ["opencode-plugin-coding@0.1.5"]
```

### Global installation (optional)

To make the plugin available across all projects without adding it to each project's `opencode.json`, add the same `plugin` entry to `~/.config/opencode/opencode.json`.

### 2. Run /zooplankton-coding-init

From your project root in OpenCode, run:

```
/zooplankton-coding-init
```

This will:
- Auto-detect project settings (language, framework, package manager, commands)
- Generate `.opencode/workflow.json` with project-specific configuration and agent definitions
- Update `.gitignore` for ephemeral plugin files

### 3. Configure agents

Review the `agents` section in `.opencode/workflow.json`. Each agent is a `{ name, model }` object. The plugin reads these at startup and dynamically registers agents with the appropriate permissions and prompts from the guide files. To change models or add/remove agents, just edit `workflow.json` and restart OpenCode.

> **How it works:** The plugin uses OpenCode's `config` hook to register agents via `config.agent`, skills via `config.skills.paths`, and commands via `config.command`.

## Project-Level Files

After `/zooplankton-coding-init`, your project will have:

| File | Committed? | Purpose |
|------|-----------|---------|
| `.opencode/workflow.json` | Yes | Project configuration + agent definitions |
| `.opencode/reviewer-knowledge.json` | No (gitignored) | Adaptive reviewer scoring cache |
| `.opencode/plans/<branch>.md` | No (gitignored) | Ephemeral plan files |
| `.opencode/retrospectives/<branch>.md` | No (gitignored) | Ephemeral retrospective files |

## Configuration

`workflow.json` schema:

```json
{
  "project": {
    "name": "my-project",
    "repo": "Org/my-project",
    "defaultBranch": "master",
    "platform": "github"
  },
  "stack": {
    "language": "typescript",
    "framework": "react",
    "packageManager": "yarn"
  },
  "commands": {
    "build": "yarn build",
    "lint": "yarn lint",
    "test": "yarn test",
    "typecheck": "npx tsc --noEmit"
  },
  "agents": {
    "coreCoder": { "name": "core-coder", "model": "github-copilot/claude-opus-4.6" },
    "coreReviewers": [
      { "name": "core-reviewer-primary", "model": "github-copilot/claude-sonnet-4.6" },
      { "name": "core-reviewer-secondary", "model": "github-copilot/gpt-5.4" }
    ],
    "reviewers": [
      { "name": "reviewer-glm", "model": "alibaba-coding-plan-cn/glm-5" },
      { "name": "reviewer-minimax", "model": "minimax-cn-coding-plan/MiniMax-M2.7" }
    ],
    "securityReviewers": []
  },
  "testDrivenDevelopment": { "enabled": false },
  "docsToRead": ["AGENTS.md"],
  "reviewFocus": ["type safety", "error handling"]
}
```

## License

MIT
