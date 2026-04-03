# Orchestrate Flow Smoke Test

Checklist for validating the orchestrate workflow end-to-end within this repository.

## What This Validates

- **Phase 1 (Setup):** Worktree creation, `workflow.json` reading, platform detection, stale-plan detection
- **Phase 2 (Implement):** Core-coder dispatched, feature branch created from `origin/master`, changes committed and pushed
- **Phase 3 (Review):** Core reviewers and normal reviewers dispatched in parallel, non-blocking wait for normal reviewers
- **Phase 4 (Evaluate):** Blocking vs advisory triage, revision rounds (if any), final-round `doc/TODO.md` handling, pre-merge summary
- **Phase 5 (Retrospective):** Retrospective file written, reviewer scores recorded, `AGENTS.md` update suggestions proposed

---

## GitHub Mode Checklist

Set `project.platform: "github"` in `.opencode/workflow.json` (or auto-detected from `project.repo`).

### How to Run

1. Open this repository in OpenCode with the plugin loaded.
2. Ask the orchestrator to implement a small, low-risk change (e.g., a documentation tweak).
3. Let the full orchestrate flow run through all 5 phases.
4. Verify each checkpoint below.

### Checklist

| # | Checkpoint | Expected |
|---|------------|----------|
| 1 | Worktrees created | `.worktrees/core-coder`, `.worktrees/core-reviewer-primary`, `.worktrees/core-reviewer-secondary` exist |
| 2 | Plan file written | `.opencode/plans/<branch>.md` exists with `status: not_started` → `in_progress` |
| 3 | PR created | `gh pr list` shows the PR against `master` |
| 4 | Core reviewers ran | Both core reviewers posted review comments on the PR |
| 5 | Normal reviewers dispatched | Normal reviewers dispatched (non-blocking; zero or more may post before deadline) |
| 6 | Revision rounds | If blocking issues found, core-coder was re-invoked (max 3 rounds) |
| 7 | Pre-merge summary | PR comment with "Pre-Merge PR Summary" section posted before merge prompt |
| 8 | User approval | Orchestrator asked for explicit user confirmation before merging |
| 9 | Merge + cleanup | PR squash-merged, branch deleted locally and remotely, worktrees detached |
| 10 | Retrospective | `.opencode/retrospectives/<branch>.md` written |
| 11 | Reviewer knowledge | `.opencode/reviewer-knowledge.json` updated with scores |
| 12 | Plan completed | Plan file status set to `completed` |
| 13 | Security review gate | If `securityReviewers` configured, security reviewer posted verdict before merge |
| 14 | `doc/TODO.md` evaluated | On final revision round, core-coder reported TODO.md additions or dismissals |

---

## Local Mode Checklist

Set `project.platform: "local"` in `.opencode/workflow.json`.

### How to Run

1. Open this repository in OpenCode with the plugin loaded.
2. Set `project.platform` to `"local"` in `.opencode/workflow.json`.
3. Ask the orchestrator to implement a small, low-risk change.
4. Let the full orchestrate flow run through all 5 phases.
5. Verify each checkpoint below.

### Checklist

| # | Checkpoint | Expected |
|---|------------|----------|
| 1 | Platform detected | Orchestrator loaded `SKILL-local.md` (not `SKILL-github.md`) |
| 2 | Worktrees created | `.worktrees/core-coder`, `.worktrees/core-reviewer-primary`, `.worktrees/core-reviewer-secondary` exist |
| 3 | Plan file written | `.opencode/plans/<branch>.md` exists with `status: not_started` → `in_progress` |
| 4 | Branch pushed | `git branch -a` shows the feature branch (no PR created) |
| 5 | No `gh` calls | No `gh api`, `gh pr create`, or other `gh` commands were invoked |
| 6 | Core reviewers ran | Both core reviewers returned structured review results via task return values |
| 7 | Normal reviewers dispatched | Normal reviewers dispatched (non-blocking); used `git diff`/`git log` and `read` tool |
| 8 | Review findings as text | All review findings returned as structured text (not posted to GitHub API) |
| 9 | Revision rounds | If blocking issues found, core-coder received feedback directly in prompt (not via `gh api`) |
| 10 | Pre-merge summary | Summary printed to stdout (not posted as PR comment) |
| 11 | User approval | Orchestrator asked for explicit user confirmation before merging |
| 12 | Merge via `--no-ff` | `git log --oneline` shows a merge commit (not squash), branch deleted locally |
| 13 | No remote branch delete | No `git push origin --delete` was run |
| 14 | Retrospective | `.opencode/retrospectives/<branch>.md` written |
| 15 | Reviewer knowledge | `.opencode/reviewer-knowledge.json` updated with scores |
| 16 | Plan completed | Plan file status set to `completed` |
| 17 | Security review gate | If `securityReviewers` configured, security reviewer returned verdict as text before merge |
| 18 | `doc/TODO.md` evaluated | On final revision round, core-coder reported TODO.md additions or dismissals |

---

## Notes

- This repo has only `test` (`npm test`) configured in `.opencode/workflow.json` → `commands`. Build, lint, and typecheck are empty strings. Verification steps will report **PASS** or **FAIL** for `test`, and **N/A — not configured** for the others.
- Security reviewers are configured in this repo (`agents.securityReviewers` in `.opencode/workflow.json`) and only run pre-merge. Checkpoint 13 (GitHub) / 17 (local) validates this gate.
- The smoke test is intentionally run on a trivial change to minimize risk.
- The default branch is read from `.opencode/workflow.json` → `project.defaultBranch`. It is `master` for this repo but may differ in other projects.
- **Platform auto-detection:** If `project.platform` is absent, the dispatcher auto-detects from `project.repo`. For this repo (`ZooplanktonAI/opencode-plugin-coding`), it auto-detects as `github`. Set `"platform": "local"` explicitly to test local mode.
