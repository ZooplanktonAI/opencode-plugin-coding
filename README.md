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

## Commands

| Command | Description |
|---------|-------------|
| `/init` | Auto-detect project, generate `workflow.json` and agent files |
| `/update` | Sync agent files with latest plugin templates (preserves model assignments) |

## Agent Templates

4 templates in `templates/agents/` cover all agent roles. Each has a `$MODEL` placeholder and a `# plugin-version: N` header for update tracking.

| Template | Role | Default instances |
|----------|------|-------------------|
| `core-coder.md` | Core implementation agent | 1 |
| `core-reviewer.md` | Core reviewer (blocking, worktree) | 2 |
| `reviewer.md` | Normal reviewer (non-blocking, diff-based) | 6 |
| `security-reviewer.md` | Security reviewer (pre-merge) | 0 (opt-in) |

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
- Generate `.opencode/agents/*.md` files for all configured agents (core-coder, reviewers, etc.)
- Update `.gitignore` for ephemeral plugin files

### 3. Configure agents

Review the generated agent files in `.opencode/agents/`. Each file is generated from one of 4 templates (`templates/agents/`) with the model ID injected. Adjust model IDs as needed — the agent names in `workflow.json` reference these files.

### 4. Keep agents in sync

When the plugin updates its agent templates, run:

```
/update
```

This diffs the plugin templates against your project's agent files, preserves your model assignments, and lets you accept or reject each change.

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
    "defaultBranch": "master"
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
    "coreCoder": "core-coder",
    "coreReviewers": ["core-reviewer-1", "core-reviewer-2"],
    "reviewers": ["reviewer-1", "reviewer-2", "reviewer-3", "reviewer-4", "reviewer-5", "reviewer-6"],
    "securityReviewers": []
  },
  "testDrivenDevelopment": { "enabled": false },
  "docsToRead": ["AGENTS.md"],
  "reviewFocus": ["type safety", "error handling"]
}
```

## License

UNLICENSED — private to ZooplanktonAI.
