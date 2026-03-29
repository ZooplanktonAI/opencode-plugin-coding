# AGENTS.md — opencode-plugin-coding

Project knowledge base for agents working on this repository.

## What This Repo Is

A shared OpenCode plugin that provides multi-agent software development workflows (brainstorm, plan, orchestrate, review, debug) for ZooplanktonAI projects. It is NOT an application — it contains markdown skills, guides, agent templates, and a JS plugin entry point.

## Repository Structure

```
opencode-plugin-coding/
├── .opencode/
│   ├── plugins/opencode-plugin-coding.js   # Plugin entry point (config hook)
│   ├── agents/*.md                         # Self-hosted agent files (for developing this repo)
│   └── workflow.json                       # Self-hosted workflow config
├── commands/
│   ├── zooplankton-coding-init.md          # /zooplankton-coding-init command
│   └── zooplankton-coding-update.md        # /zooplankton-coding-update command
├── guides/
│   ├── core-coder-guide.md                 # Instructions for core implementation agent
│   ├── core-reviewer-guide.md              # Instructions for core reviewers (worktree + verification)
│   ├── reviewer-guide.md                   # Instructions for normal reviewers (diff-based)
│   └── security-reviewer-guide.md          # Instructions for security reviewer (pre-merge)
├── skills/
│   ├── brainstorm/SKILL.md                 # Socratic design interview
│   ├── plan/SKILL.md                       # Task decomposition + plan-to-disk
│   ├── orchestrate/SKILL.md                # Full multi-agent workflow (~430 lines)
│   ├── test-driven-development/SKILL.md    # RED-GREEN-REFACTOR cycle
│   ├── systematic-debugging/SKILL.md       # 4-phase debugging
│   ├── git-worktree/SKILL.md              # Worktree management
│   └── playwright/SKILL.md                # MCP-based browser automation
├── templates/
│   ├── agents/                             # 4 agent templates with $MODEL placeholder
│   ├── workflow.json                       # Template for /zooplankton-coding-init
│   ├── plan.md                             # Plan file template
│   └── retrospective.md                    # Retrospective template
├── doc/
│   └── IMPLEMENTATION_PLAN.md              # Canonical implementation roadmap
├── package.json
├── README.md
└── AGENTS.md                               # This file
```

## Key Conventions

### File types

All content files are markdown (`.md`). The only JS file is the plugin entry point at `.opencode/plugins/opencode-plugin-coding.js`. There is no build step.

### Naming

- **Config fields:** camelCase (`coreCoder`, `coreReviewers`, `testDrivenDevelopment`, `reviewFocus`)
- **Agent names:** kebab-case with numeric suffix (`core-coder`, `core-reviewer-1`, `reviewer-3`)
- **Agent names are model-agnostic:** Never put model names in agent filenames. Model is defined only in the agent `.md` frontmatter.
- **Command names:** prefixed with `zooplankton-coding-` to avoid colliding with OpenCode built-ins

### Agent templates

4 templates in `templates/agents/`. Each has:
- `# plugin-version: N` as the first line (for update tracking)
- `$MODEL` placeholder in YAML frontmatter (replaced during `/zooplankton-coding-init`)
- Full permission block matching what the source repos use

When modifying templates, always bump the `plugin-version` number.

### Agent permissions (source of truth)

| Role | edit | bash | read | webfetch |
|------|------|------|------|----------|
| core-coder | allow | `'*': allow` | allow | allow |
| core-reviewer | deny | `'*': allow` | allow | deny |
| normal reviewer | deny | `'*': deny` + `gh` allowlist | allow | deny |
| security reviewer | deny | `'*': deny` + `gh` allowlist | allow | deny |

Normal/security reviewer `gh` allowlist: `gh api *`, `gh pr diff *`, `gh pr view *`, `gh pr checks *`.

### Plugin mechanism

The plugin uses OpenCode's `config` hook (undocumented but confirmed in OpenCode source) to:
1. Add `skills/` to `config.skills.paths` for skill discovery
2. Register commands from `commands/*.md` into `config.command`

No symlinks are used. Consumer projects install via `"plugin"` array in `opencode.json`.

### workflow.json

Each consumer project has `.opencode/workflow.json` with project-specific settings. The `agents` section stores **names only** (strings), not `{ name, model }` objects. Agent `.md` files are the single source of truth for model, permissions, and prompt.

## Gotchas

- **`package.json` main** points to `.opencode/plugins/opencode-plugin-coding.js` — this is intentional for the plugin system, not a mistake.
- **Self-hosted agent files** in `.opencode/agents/` are real instantiated agents for developing this repo (not templates). They have actual model IDs, not `$MODEL`.
- **The orchestrate skill is the largest file** (~430 lines). When editing, be careful with the phase structure. Use targeted edits, not full rewrites.
- **`.opencode/reviewer-knowledge.json`** is gitignored and ephemeral. Accept loss on fresh clone.
- **Plan/retrospective files** are gitignored. Only completed plans >7 days old are auto-deleted; stale non-completed plans trigger alerts.
- **The `# plugin-version: N` line must be the first line** of agent template files — before the YAML frontmatter delimiter.
- **Use `<<'EOF'` (single-quoted)** in heredocs within skill/guide bash examples to prevent shell variable expansion inside JSON.

## Review Focus

When reviewing changes to this repo:
- Verify cross-file references (command names, config field names, agent names, guide paths)
- Check that template permissions match the permission table above
- Ensure consistency between templates and self-hosted agent files
- Confirm `plugin-version` is bumped when templates change
