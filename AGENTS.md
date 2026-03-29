# AGENTS.md — opencode-plugin-coding

Project knowledge base for agents working on this repository.

## What This Repo Is

A shared OpenCode plugin that provides multi-agent software development workflows (brainstorm, plan, orchestrate, review, debug) for ZooplanktonAI projects. It is NOT an application — it contains markdown skills, guides, and a JS plugin entry point that dynamically registers agents.

## Repository Structure

```
opencode-plugin-coding/
├── .opencode/
│   ├── plugins/opencode-plugin-coding.js   # Plugin entry point (config hook)
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
- **Agent names are model-agnostic:** Never put model names in agent names. Model is defined only in `workflow.json` → `agents` → `{ name, model }`.
- **Command names:** prefixed with `zooplankton-coding-` to avoid colliding with OpenCode built-ins

### Agent architecture

Agents are **dynamically registered** by the plugin JS via OpenCode's `config.agent` API. There are no `.opencode/agents/*.md` files in consumer projects. The plugin reads:

1. **workflow.json** → `agents` section for `{ name, model }` definitions
2. **guides/*.md** for prompt content (used as the agent's `prompt` field)
3. **Hardcoded permission maps** in the plugin JS (matching the source of truth table below)

This means:
- To add/remove agents or change models, edit `workflow.json` and restart OpenCode
- Guide changes take effect immediately (no per-project files to update)
- Permissions are controlled centrally in the plugin

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
3. Register agents from `workflow.json` + `guides/*.md` into `config.agent`

No symlinks are used. Consumer projects install via `"plugin"` array in `opencode.json`.

### workflow.json

Each consumer project has `.opencode/workflow.json` with project-specific settings. The `agents` section stores `{ name, model }` objects. The plugin reads these to dynamically register agents with the correct model, permissions (from role), and prompt (from guide file).

## Gotchas

- **`package.json` main** points to `.opencode/plugins/opencode-plugin-coding.js` — this is intentional for the plugin system, not a mistake.
- **The orchestrate skill is the largest file** (~430 lines). When editing, be careful with the phase structure. Use targeted edits, not full rewrites.
- **`.opencode/reviewer-knowledge.json`** is gitignored and ephemeral. Accept loss on fresh clone.
- **Plan/retrospective files** are gitignored. Only completed plans >7 days old are auto-deleted; stale non-completed plans trigger alerts.
- **Use `<<'EOF'` (single-quoted)** in heredocs within skill/guide bash examples to prevent shell variable expansion inside JSON.
- **No agent `.md` files in consumer projects** — agents are registered dynamically. If you see references to `.opencode/agents/*.md` in consumer projects, those are stale artifacts from before the architecture change.

## Review Focus

When reviewing changes to this repo:
- Verify cross-file references (command names, config field names, agent names, guide paths)
- Check that plugin JS permission maps match the permission table above
- Ensure workflow.json template and self-hosted config use `{ name, model }` objects
- Confirm guide files are self-consistent with skills that reference them
