# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] — 2026-04-03

### Added
- **Local platform support** — full `-local` guide variants for all four agent roles (core-coder, core-reviewer, reviewer, security-reviewer) for git-only workflows without GitHub.
- **`detectPlatform()`** — auto-detects platform from `workflow.json` → `project.platform` (explicit) or `project.repo` URL (contains `github.com`). Bare `Org/repo` slugs default to `local`.
- **GitHub Enterprise auto-detection** — `project.githubEnterpriseHosts` array in `workflow.json` allows custom GHE domains to be detected as `github` platform.
- **Platform-aware guide selection at registration time** — `registerAgents()` now selects the correct `-github` or `-local` guide variant when the plugin starts, injecting full guide content into each agent's `prompt`. No runtime file resolution needed in consumer projects.
- **`SKILL-github.md` and `SKILL-local.md`** — the monolithic orchestrate `SKILL.md` is split into platform-specific variants; a thin dispatcher at `SKILL.md` redirects the orchestrator at runtime (the orchestrator has read access to both files).
- **Origin remote check** — Phase 1 of both orchestrate variants now checks for an `origin` remote with `git remote get-url origin` and aborts with a clear error if missing.
- **TDD integration in orchestrate** — both SKILL variants now include a TDD Integration section describing how to enable test-driven development mode via `workflow.json` → `testDrivenDevelopment.enabled`.
- **`git fetch *`** added to reviewer and security-reviewer bash allowlists (plugin JS and local guides).
- **GitHub Actions CI** — `.github/workflows/ci.yml` runs `npm test` on push to master and on PRs, with workflow-level concurrency controls to cancel stale runs.
- **Husky pre-commit hook** — `npm test` runs automatically before every commit.
- **Unit test suite** (`tests/opencode-plugin-coding.test.js`, 65 tests) covering all exported functions: `extractFrontmatter`, `buildGithubAccountPrompt`, `readWorkflowJson`, `readWorkflowLocalJson`, `readGuide`, `detectPlatform`, `loadCommands`, `registerAgents`, `ZooplanktonCodingPlugin`.

### Changed
- `registerAgents()` now reads `project.platform` from `workflow.json` and selects the correct guide variant at startup rather than relying on runtime dispatcher files.
- `AGENT_ROLES` defaults updated to use `-github` guide variants; `-local` variants selected when `detectPlatform()` returns `"local"`.
- Guide dispatcher files removed (4 files) — guide content is now injected directly into agent prompts at registration time.
- Plan template (`templates/plan.md`) extended with `design` field, Dependencies, and Risks sections.
- `templates/workflow.json` updated with `githubEnterpriseHosts` field and cleaner agent structure.
- `INSTALL.md` updated with local-mode setup instructions, `githubEnterpriseHosts` example, and updated reviewer bash allowlist.
- `workflow-local.json` added to `.gitignore`.
- `doc/IMPLEMENTATION_PLAN.md` archived to `doc/archived/` (severely stale).
- Orchestrate SKILL: fixed round-3 final-round signal contradiction; fixed `git checkout -b` → `-B`; changed "both core reviewers" → "all core reviewers".
- Playwright skill: fixed MCP package name (`@anthropic/mcp-playwright` → `@playwright/mcp`).
- Various model ID fixes (MiniMax M2.5 → M2.7, provider `alibaba` → `minimax-cn`).
- `zooplankton-coding-update` command: removed unimplementable guide changelog step; cleaned up frontmatter.

### Fixed
- `assert.equal(x, undefined)` replaced with `assert.ok(!(key in obj))` in tests to correctly verify key absence.

## [0.1.5] — 2026-03-30

### Added
- `githubAccount` config support — per-role and root `default` GitHub account mapping via `workflow-local.json`, injected as inline `GH_TOKEN=...` prefix in all `gh` commands.
- Steps cap for reviewer agents: `reviewer` defaults to 80, `securityReviewer` defaults to 120.
- Descriptive/model-named agent naming convention (e.g. `reviewer-glm`, `reviewer-deepseek`).

## [0.1.4] — 2026-03-29

### Added
- Initial npm publish.
- Dynamic agent registration via `config` hook (no `.opencode/agents/*.md` files needed in consumer projects).
- Skills directory registration via `config.skills.paths`.
- Commands loaded from `commands/*.md` via `config.command`.
- Brainstorm, plan, orchestrate, TDD, systematic-debugging, git-worktree, and Playwright skills.
- Core-coder, core-reviewer, reviewer, and security-reviewer guide files.
- `/zooplankton-coding-init` and `/zooplankton-coding-update` commands.
