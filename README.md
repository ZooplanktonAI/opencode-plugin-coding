# opencode-plugin-coding

A shared [OpenCode](https://opencode.ai) plugin for multi-agent software development workflows. Provides skills, guides, and templates that standardize the full cycle: brainstorm, plan, implement, review, debug, and retrospect.

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

## Guides

- `guides/core-coder-guide.md` — Instructions for the core implementation agent
- `guides/core-reviewer-guide.md` — Instructions for core reviewers (worktree + full verification)
- `guides/reviewer-guide.md` — Instructions for normal reviewers (diff-based review)
- `guides/security-reviewer-guide.md` — Instructions for the security reviewer (pre-merge)

## Setup

### 1. Install skills into your project

Symlink or copy the skills into your project's `.opencode/skills/` directory:

```bash
# Symlink approach (recommended for development)
ln -s /path/to/opencode-plugin-coding/skills/* .opencode/skills/

# Or copy for standalone use
cp -r /path/to/opencode-plugin-coding/skills/* .opencode/skills/
```

### 2. Run /init

From your project root in OpenCode, run:

```
/init
```

This will:
- Auto-detect project settings (language, framework, package manager, commands)
- Generate `.opencode/workflow.json` with project-specific configuration
- Update `.gitignore` for ephemeral plugin files

### 3. Configure agents

Set up agent files in `.opencode/agents/` for your core-coder, core-reviewers, and normal reviewers. See `AGENTS.md` in your project for the recommended setup.

## Project-Level Files

After `/init`, your project will have:

| File | Committed? | Purpose |
|------|-----------|---------|
| `.opencode/workflow.json` | Yes | Project configuration |
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
    "defaultBranch": "main"
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
    "coreCoder": { "model": "github-copilot/claude-opus-4.6" },
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
    "securityReviewer": { "enabled": false }
  },
  "tdd": { "enabled": false },
  "docsToRead": ["AGENTS.md"],
  "reviewFocus": ""
}
```

## License

UNLICENSED — private to ZooplanktonAI.
