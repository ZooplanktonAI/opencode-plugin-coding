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
│   ├── core-coder-guide-github.md          # GitHub-mode core coder instructions
│   ├── core-coder-guide-local.md           # Local-mode core coder instructions
│   ├── core-reviewer-guide-github.md       # GitHub-mode core reviewer instructions
│   ├── core-reviewer-guide-local.md        # Local-mode core reviewer instructions
│   ├── reviewer-guide-github.md            # GitHub-mode normal reviewer instructions
│   ├── reviewer-guide-local.md             # Local-mode normal reviewer instructions
│   ├── security-reviewer-guide-github.md   # GitHub-mode security reviewer instructions
│   └── security-reviewer-guide-local.md    # Local-mode security reviewer instructions
├── skills/
│   ├── brainstorm/SKILL.md                 # Socratic design interview
│   ├── plan/SKILL.md                       # Task decomposition + plan-to-disk
│   ├── orchestrate/
│   │   ├── SKILL.md                        # Dispatcher → loads -github or -local variant
│   │   ├── SKILL-github.md                 # GitHub-mode orchestrate skill (~450 lines)
│   │   └── SKILL-local.md                  # Local-mode orchestrate skill
│   ├── test-driven-development/SKILL.md    # RED-GREEN-REFACTOR cycle
│   ├── systematic-debugging/SKILL.md       # 4-phase debugging
│   ├── git-worktree/SKILL.md               # Worktree management
│   └── playwright/SKILL.md                 # MCP-based browser automation
├── templates/
│   ├── workflow.json                       # Template for /zooplankton-coding-init
│   ├── workflow-local.json                 # Template for workflow-local.json
│   ├── plan.md                             # Plan file template
│   └── retrospective.md                    # Retrospective template
├── doc/
│   ├── archived/                           # Archived docs (stale, kept for reference)
│   │   └── IMPLEMENTATION_PLAN.md          # Original implementation roadmap (archived)
│   ├── SMOKE_TEST.md                       # Orchestrate flow smoke-test checklist
│   └── TODO.md                             # Deferred advisory items from reviews
├── tests/
│   └── opencode-plugin-coding.test.js      # Unit tests for the plugin JS (node:test)
├── .husky/
│   └── pre-commit                          # Runs npm test before every commit
├── package.json
├── README.md
├── INSTALL.md                              # Installation guide for consumer projects
└── AGENTS.md                               # This file
```

## Key Conventions

### File types

All content files are markdown (`.md`). The only JS file is the plugin entry point at `.opencode/plugins/opencode-plugin-coding.js`. There is no build step.

### Naming

- **Config fields:** camelCase (`coreCoder`, `coreReviewers`, `testDrivenDevelopment`, `reviewFocus`)
- **Agent names:** kebab-case, descriptive of role (e.g., `core-coder`, `core-reviewer-primary`, `reviewer-glm`)
- **Agent names may reflect model identity** when it aids clarity (e.g., `reviewer-glm`, `reviewer-deepseek`). The name is free-form — the model is set separately in `workflow.json` → `agents` → `{ name, model }`.
- **Command names:** prefixed with `zooplankton-coding-` to avoid colliding with OpenCode built-ins

### Agent architecture

Agents are **dynamically registered** by the plugin JS via OpenCode's `config.agent` API. There are no `.opencode/agents/*.md` files in consumer projects. The plugin reads:

1. **workflow.json** → `agents` section for `{ name, model }` definitions
2. **workflow.json** → `project.platform` for platform detection (selects `-github` or `-local` guide variant)
3. **guides/*-github.md / *-local.md** for prompt content (used as the agent's `prompt` field)
4. **Hardcoded permission maps** in the plugin JS (matching the source of truth table below)

This means:
- To add/remove agents or change models, edit `workflow.json` and restart OpenCode
- Guide changes take effect immediately (no per-project files to update)
- Permissions are controlled centrally in the plugin

### Agent permissions (source of truth)

| Role | edit | bash | read | webfetch |
|------|------|------|------|----------|
| core-coder | allow | `'*': allow` | allow | allow |
| core-reviewer | deny | `'*': allow` | allow | deny |
| normal reviewer | deny | `'*': deny` + `gh`/`git` allowlist | allow | deny |
| security reviewer | deny | `'*': deny` + `gh`/`git` allowlist | allow | deny |

Normal/security reviewer bash allowlist: `gh api *`, `gh pr diff *`, `gh pr view *`, `gh pr checks *`, `git diff *`, `git log *`, `git fetch *`. The `gh` entries are used in GitHub mode; the `git` entries are used in local mode. Both are always present — guides instruct agents which to use based on platform.

### Plugin mechanism

The plugin uses OpenCode's `config` hook (undocumented but confirmed in OpenCode source) to:
1. Add `skills/` to `config.skills.paths` for skill discovery
2. Register commands from `commands/*.md` into `config.command`
3. Detect platform from `workflow.json` → `project.platform` and register agents with the correct guide variant (`-github` or `-local`)

No symlinks are used. Consumer projects install via `"plugin"` array in `opencode.json`.

### workflow.json

Each consumer project has `.opencode/workflow.json` with project-specific settings. The `agents` section stores `{ name, model?, steps? }` objects. The plugin reads these to dynamically register agents with the correct model, permissions (from role), and prompt (from guide file). The optional `steps` field caps the agent's maximum agentic iterations; reviewer agents default to `80` and security-reviewer agents default to `120` if unset.

### workflow-local.json

Each user creates `.opencode/workflow-local.json` (gitignored) for user-specific settings. Currently supports GitHub account mapping:

```json
{
  "github": {
    "account": {
      "default": "pancake-zinc",
      "reviewer": "panezhang"
    }
  }
}
```

Keys under `github.account` match the internal role names: `coreCoder`, `coreReviewer`, `reviewer`, `securityReviewer`. The `default` key applies to all roles unless overridden. Resolution: per-role > default > none.

When set, agents are instructed to prefix all `gh` commands with `GH_TOKEN=$(gh auth token --user <account>)` to avoid conflicts between concurrent agents sharing the same `~/.config/gh/hosts.yml`.

### Platform system

The plugin supports two platform modes: `github` and `local`. The platform is set in `workflow.json` → `project.platform`.

**Auto-detection** (if `platform` is absent or empty): if `project.repo` is non-empty and contains `github.com`, use `github`. If it doesn't match `github.com` but matches any hostname in `project.githubEnterpriseHosts`, also use `github`. Otherwise use `local`. A bare `Org/repo` slug alone is not sufficient — GitLab and Bitbucket also use this pattern.

**How it works:** The plugin JS reads `project.platform` from `workflow.json` at registration time and selects the correct `-github` or `-local` guide variant as the agent's prompt. No runtime file resolution is needed — the platform-specific guide content is injected directly into the agent config at startup. For the orchestrate skill, a thin dispatcher file at `skills/orchestrate/SKILL.md` reads `project.platform` and redirects the orchestrator to the correct variant (`SKILL-github.md` or `SKILL-local.md`). The orchestrator has read access to both files.

Variants:
- `-github.md` — full GitHub API integration (PRs, review comments via `gh api`, squash merge)
- `-local.md` — git-only workflow (branch push, `git merge --no-ff`, review findings via task return values)

The plugin JS always loads the platform-specific guide variant at registration time. No guide dispatcher files are needed — the `AGENT_ROLES` default to `-github` guides, and the platform selection logic overrides with `-local` when appropriate.

## Gotchas

- **`package.json` main** points to `.opencode/plugins/opencode-plugin-coding.js` — this is intentional for the plugin system, not a mistake.
- **The orchestrate skill is the largest file** (~450 lines). When editing, be careful with the phase structure. Use targeted edits, not full rewrites.
- **`.opencode/reviewer-knowledge.json`** is gitignored and ephemeral. Accept loss on fresh clone.
- **Plan/retrospective files** are gitignored. Only completed plans >7 days old are auto-deleted; stale non-completed plans trigger alerts.
- **Use `<<'EOF'` (single-quoted)** in heredocs within skill/guide bash examples to prevent shell variable expansion inside JSON.
- **No agent `.md` files in consumer projects** — agents are registered dynamically. If you see references to `.opencode/agents/*.md` in consumer projects, those are stale artifacts from before the architecture change.
- **Session reuse across review rounds** — the orchestrate skill recommends passing `task_id` to resume reviewer sessions across rounds, so reviewers retain context. If a resumed session fails, fall back to a fresh session.
- **Orchestrate smoke test** — to validate the full orchestrate flow in this repo, see `doc/SMOKE_TEST.md`. Use a trivial change (e.g., docs tweak) and run all 5 phases. Note that only `test` (`npm test`) is configured in `.opencode/workflow.json`; build, lint, and typecheck will report "N/A — not configured."
- **Guide variant selection is compile-time** — the plugin JS selects the correct `-github` or `-local` guide at registration time based on `project.platform` in `workflow.json`. Agents receive the full guide content in their prompt — they never need to resolve guide file paths at runtime. The `skills/orchestrate/SKILL.md` dispatcher is the only file that redirects at runtime (for the orchestrator, which has read access).
- **Orchestrate requires `origin` remote** — both GitHub and local mode require a git remote named `origin`. Phase 1 of the orchestrate skill checks for this and aborts with a clear error if missing. Repos with no remote cannot use the orchestrate workflow.

## Testing

The plugin JS is unit-tested using Node.js built-in `node:test` (zero extra dependencies).

```bash
npm test          # run once
npm run prepare   # (re-)install the hook if it was lost
```

The pre-commit hook (`.husky/pre-commit`) runs `npm test` automatically before every commit. After a fresh clone run `npm install` — this triggers the `prepare` script which installs the hook.

To bypass in an emergency: `git commit --no-verify` or set `HUSKY=0` in the environment.

### Test file

`tests/opencode-plugin-coding.test.js` — 65 tests across 9 suites covering all exported functions:

| Suite | What it covers |
|-------|---------------|
| `extractFrontmatter` | No frontmatter, valid meta, quoted values, colon-in-value, empty body/meta |
| `buildGithubAccountPrompt` | Account name, GH_TOKEN pattern, auth-switch warning |
| `readWorkflowJson` | Missing file, invalid JSON, valid parse |
| `readWorkflowLocalJson` | Same as above |
| `readGuide` | Missing file, existing file (trimmed) |
| `detectPlatform` | Explicit github/local, auto-detect from repo URL, bare slug, empty/absent repo, null workflow, explicit override, GHE custom-domain hosts (match, no-match, non-array, non-string entries) |
| `loadCommands` | Key naming, required fields, optional agent/model fields, frontmatter parsing |
| `registerAgents` | All code paths: object/array/string entries, GitHub account resolution, steps defaults, permissions for all 4 roles, user-override protection, platform-aware guide selection (github/local/auto-detect/override/fallback) |
| `ZooplanktonCodingPlugin` | Skills path, commands, agents, idempotency, override protection |

### Test gotchas

- **Name test files after their source file.** Use `opencode-plugin-coding.test.js` for `opencode-plugin-coding.js`, not a generic name like `plugin.test.js`.
- **Use `assert.ok(!("key" in obj))` to verify key absence**, not `assert.equal(obj.key, undefined)`. The latter passes even when the key exists with value `undefined` — it doesn't actually verify the key is absent.
- **When a function has multiple code paths** (e.g., bare string vs object agent entry), test key-absence and other negative assertions for *both* paths, not just one.

---

## Review Focus

When reviewing changes to this repo:
- Verify cross-file references (command names, config field names, agent names, guide paths)
- Check that plugin JS permission maps match the permission table above
- Ensure workflow.json template and self-hosted config use `{ name, model }` objects
- Confirm `github.account` in `workflow-local.json` maps correctly: keys match workflow.json agent fields, resolution is per-role > default > none
- Confirm guide files are self-consistent with skills that reference them
