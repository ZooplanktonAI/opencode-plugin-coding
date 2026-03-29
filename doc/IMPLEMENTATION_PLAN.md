# opencode-plugin-coding Implementation Plan

Last updated: 2026-03-30

## 1) Goal

Build a shared OpenCode plugin (`opencode-plugin-coding`) that standardizes and improves multi-agent software development workflows across ZooplanktonAI projects. The plugin should support full flow from idea to merge:

- Brainstorm
- Planning
- Implementation orchestration
- Parallel review
- Security review (pre-merge only in v1)
- Post-merge retrospective

The plugin should reduce duplicated local skill files, preserve project-specific flexibility where needed, and keep configuration minimal in v1.

## 2) Scope (v1)

### Included

- 7 skills:
  - `brainstorm`
  - `plan`
  - `orchestrate`
  - `test-driven-development`
  - `systematic-debugging`
  - `git-worktree`
  - `playwright` (MCP-based, external dependency)
- 4 guide files:
  - `guides/core-coder-guide.md`
  - `guides/core-reviewer-guide.md`
  - `guides/reviewer-guide.md`
  - `guides/security-reviewer-guide.md`
- Templates:
  - `templates/workflow.json`
  - `templates/plan.md`
  - `templates/retrospective.md`
  - `templates/agents/core-coder.md`
  - `templates/agents/core-reviewer.md`
  - `templates/agents/reviewer.md`
  - `templates/agents/security-reviewer.md`
- `/zooplankton-coding-init` command to bootstrap project-level config.
- `/zooplankton-coding-update` command to sync agent files with latest plugin templates.

### Explicitly out of scope (v1)

- Security reviewer timing modes beyond pre-merge.
- Large per-project override surfaces for reviewer area mapping.

## 3) High-Level Architecture

### Plugin-level canonical assets

- Skills and guides are centralized in this plugin repo.
- Review areas are defined in plugin guides/orchestrator logic, not in per-project config.

### Project-level state/config

- `.opencode/workflow.json` stores project-specific configuration and is committed.
- `AGENTS.md` remains the committed project knowledge base.
- Ephemeral runtime artifacts live under `.opencode/` and are gitignored.

## 4) File Tracking Policy (Project Repos)

### Commit to project repo

- `.opencode/workflow.json`
- `AGENTS.md`

### Gitignore in project repo

- `.opencode/reviewer-knowledge.json`
- `.opencode/plans/`
- `.opencode/retrospectives/`

### Init behavior

- `/zooplankton-coding-init` appends ignore entries to project `.gitignore` idempotently.

## 5) Runtime State and Cleanup Rules

### Plan files

- Path pattern: `.opencode/plans/<branch>.md`
- Include status field in frontmatter:
  - `not_started`
  - `in_progress`
  - `completed`

### Cleanup policy (run at orchestration start/end)

- Delete plans older than 7 days only if status is `completed`.
- For plans older than 7 days with non-completed status, raise stale alert (do not auto-delete).
- Delete retrospectives older than 7 days.

### Reviewer knowledge persistence

- Keep `.opencode/reviewer-knowledge.json` gitignored in v1.
- Accept reset on fresh clones.

## 6) Reviewer Model and Assignment Strategy

### Review areas

Canonical areas are plugin-defined:

- logic
- types
- architecture
- error handling
- tests
- docs

### Role behavior

- Core reviewers: always review all areas.
- Normal reviewers: assigned 1-2 areas each.

### Assignment algorithm

- Round-robin with randomness baseline.
- Weighted adaptation over time using per-model/per-area historical scores from `.opencode/reviewer-knowledge.json`.
- Keep assignment stochastic (soft weighting), not deterministic.

## 7) Security Review (v1)

- Dedicated security reviewers are optional (empty `securityReviewers` array = disabled).
- Only supported timing in v1: **pre-merge**.
- Security reviewers run before other reviewer rounds and can block progression on critical findings.
- Security checklist and severity taxonomy live in `guides/security-reviewer-guide.md`.

## 8) Orchestrate Flow (5 Phases)

### Phase 1: Setup

- Read `.opencode/workflow.json`, relevant docs, and `AGENTS.md`.
- Check stale plans and report alerts.
- Optionally set up/verify worktree flow via `git-worktree` skill.

### Phase 2: Implement

- Generate/refresh plan file on disk before dispatching coder subagent.
- Mark plan status `in_progress`.
- Core coder executes plan tasks, records learnings, runs verification commands.

### Phase 3: Review

- Create/update PR.
- Run security reviewer pre-merge (if enabled).
- Dispatch parallel core reviewers + normal reviewers.
- Core reviewers are blocking quorum; normal reviewers are non-blocking contributors.

### Phase 4: Address + Merge Readiness

- Core coder addresses required feedback.
- Re-run verification commands.
- Prepare merge-readiness summary.

### Phase 5: Retrospective

- Produce retrospective artifact.
- Update reviewer knowledge cache.
- Propose `AGENTS.md` updates (suggested diff text, user-reviewed application).
- Mark plan `completed`.
- Execute cleanup routine.

## 9) Conciseness and Review Comment Rules (Global)

Apply to all reviewer types:

- 1-3 sentences per inline comment.
- Summary output as bullet lists only.
- No conversational preambles.
- Duplicate-post guard for review comments.

These rules are encoded in reviewer guides and orchestrate prompts.

## 10) Configuration Schema (workflow.json v1)

Target structure:

```json
{
  "project": {
    "name": "",
    "repo": "",
    "defaultBranch": "master"
  },
  "stack": {
    "language": "",
    "framework": "",
    "packageManager": ""
  },
  "commands": {
    "build": "",
    "lint": "",
    "test": "",
    "typecheck": ""
  },
  "agents": {
    "coreCoder": "core-coder",
    "coreReviewers": ["core-reviewer-primary", "core-reviewer-secondary"],
    "reviewers": ["reviewer-glm"],
    "securityReviewers": []
  },
  "testDrivenDevelopment": { "enabled": false },
  "docsToRead": [],
  "reviewFocus": []
}
```

Design principle: minimal required fields; add configurability only after cross-project validation proves need.

## 11) Implementation Phases and Deliverables

### Phase A: Foundation

- Finalize repository scaffolding metadata (`README.md`, `opencode.json`, command registrations).
- Ensure all skills have valid frontmatter and clear usage semantics.

### Phase B: `/zooplankton-coding-init` and `/zooplankton-coding-update` commands

- Auto-detect project basics (`package.json`, git remote, branch, command candidates).
- Generate `.opencode/workflow.json` from template.
- Generate `.opencode/agents/*.md` from 4 agent templates (core-coder, core-reviewer, reviewer, security-reviewer) with model injection.
- Update project `.gitignore` for ephemeral files.
- Print setup summary + manual review checklist.
- `/zooplankton-coding-update` command diffs plugin templates vs project agent files, preserves model assignments, offers per-file accept/reject.
- Agent templates include `# plugin-version: N` header for staleness detection.

### Phase C: Guides

- Implement coder/reviewer/security guide content.
- Separate universal behavior from project-injected behavior.
- Encode conciseness and posting protocol standards.

### Phase D: Core skills

- Implement `brainstorm`, `plan`, and `orchestrate`.
- Ensure plan-to-disk guarantee before subagent dispatch.
- Implement non-blocking reviewer wait strategy with core quorum.

### Phase E: Specialized skills

- Implement `test-driven-development`, `systematic-debugging`, `git-worktree`, `playwright`.
- For `playwright`, document MCP requirement and fallback behavior when MCP is unavailable.

### Phase F: Retrospective + adaptive scoring

- Implement reviewer score ingestion and weighted assignment logic.
- Implement retrospective template population and AGENTS.md suggestion generation.

### Phase G: Integration tests across 3 repos

Test in:

- `letter-box-app-annie`
- `letter-box-admin`
- `game-the-stone-guardian`

For each project:

- Install/use plugin skill set.
- Run `/zooplankton-coding-init`.
- Run one end-to-end orchestrate cycle on a small task.
- Validate reviewer flow, cleanup behavior, and retrospective outputs.

### Phase H: Distribution — Plugin-based (DECIDED)

Distribution uses the OpenCode plugin system:

- **Plugin JS** (`.opencode/plugins/opencode-plugin-coding.js`) exports a `config` hook that:
  - Adds the plugin's `skills/` directory to `config.skills.paths` for skill discovery.
  - Reads `commands/*.md` and registers them via `config.command`.
- **Install method**: Add to `"plugin"` array in project `opencode.json`:
  ```
  "plugin": ["opencode-plugin-coding"]
  ```
- **`package.json`** has `"type": "module"` and `"main": ".opencode/plugins/opencode-plugin-coding.js"`.
- **No symlinks** needed in consumer projects.
- **Self-hosting**: The plugin repo itself loads the plugin from `.opencode/plugins/` (auto-discovered by OpenCode).
- **Agent files** (`.opencode/agents/*.md`) are still per-project. `/zooplankton-coding-init` generates them from templates.

## 12) Acceptance Criteria (v1)

The plugin v1 is considered ready when:

1. All 7 skills and 4 guides are fully implemented with usable instructions.
2. `/zooplankton-coding-init` reliably generates valid `workflow.json` in all 3 target repos.
3. Orchestrate flow executes end-to-end with:
   - plan file on disk before coding,
   - core + normal reviewer parallel run,
   - optional pre-merge security review,
   - retrospective output and AGENTS.md update suggestions.
4. Cleanup behavior matches status-aware policy.
5. Reviewer assignment supports adaptive weighted distribution.
6. Minimal config philosophy is preserved (no unnecessary overrides in v1).

## 13) Execution Notes for Step-by-Step Implementation

Implementation should proceed in small commits by phase.

Recommended commit sequence:

1. `chore: add plugin metadata and command registration scaffold`
2. `feat(init): generate workflow config and gitignore entries`
3. `docs(guides): add coder, reviewer, and security guides`
4. `feat(skills): implement brainstorm and plan`
5. `feat(orchestrate): implement phased workflow with review coordination`
6. `feat(skills): add tdd, systematic-debugging, git-worktree, playwright`
7. `feat(retrospective): add reviewer scoring and AGENTS proposal flow`
8. `test: validate plugin across app-annie admin stone-guardian`
9. `docs: finalize install and distribution guidance`

This plan file is the canonical execution roadmap for building v1.
