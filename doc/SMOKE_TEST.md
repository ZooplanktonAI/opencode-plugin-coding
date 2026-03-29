# Orchestrate Flow Smoke Test

Checklist for validating the orchestrate workflow end-to-end within this repository.

## What This Validates

- **Phase 1 (Setup):** Worktree creation, `workflow.json` reading, stale-plan detection
- **Phase 2 (Implement):** Core-coder dispatched, feature branch created from `origin/master`, changes committed and pushed, PR created via `gh pr create`
- **Phase 3 (Review):** Core reviewers and normal reviewers dispatched in parallel, non-blocking wait for normal reviewers, review comments posted to the PR
- **Phase 4 (Evaluate):** Blocking vs advisory triage, revision rounds (if any), final-round `doc/TODO.md` handling, pre-merge summary posted
- **Phase 5 (Retrospective):** Retrospective file written, reviewer scores recorded, `AGENTS.md` update suggestions proposed

## How to Run

1. Open this repository in OpenCode with the plugin loaded.
2. Ask the orchestrator to implement a small, low-risk change (e.g., a documentation tweak).
3. Let the full orchestrate flow run through all 5 phases.
4. Verify each checkpoint below.

## Checklist

| # | Checkpoint | Expected |
|---|------------|----------|
| 1 | Worktrees created | `.worktrees/core-coder`, `.worktrees/core-reviewer-1`, `.worktrees/core-reviewer-2` exist |
| 2 | Plan file written | `.opencode/plans/<branch>.md` exists with `status: not_started` → `in_progress` |
| 3 | PR created | `gh pr list` shows the PR against `master` |
| 4 | Core reviewers ran | Both core reviewers posted review comments on the PR |
| 5 | Normal reviewers dispatched | At least some normal reviewers posted comments (non-blocking) |
| 6 | Revision rounds | If blocking issues found, core-coder was re-invoked (max 3 rounds) |
| 7 | Pre-merge summary | PR comment with "Pre-Merge PR Summary" section posted before merge prompt |
| 8 | User approval | Orchestrator asked for explicit user confirmation before merging |
| 9 | Merge + cleanup | PR squash-merged, branch deleted locally and remotely, worktrees detached |
| 10 | Retrospective | `.opencode/retrospectives/<branch>.md` written |
| 11 | Reviewer knowledge | `.opencode/reviewer-knowledge.json` updated with scores |
| 12 | Plan completed | Plan file status set to `completed` |
| 13 | Security review gate | If `securityReviewers` configured, security reviewer posted verdict before merge |
| 14 | `doc/TODO.md` evaluated | On final revision round, core-coder reported TODO.md additions or dismissals |

## Notes

- This repo has no build/lint/test/typecheck commands configured in `.opencode/workflow.json`. Verification steps will report one of: **PASS**, **FAIL**, or **N/A — not configured**. All three are valid outcomes depending on project setup.
- Security reviewers are configured in this repo (`agents.securityReviewers` in `.opencode/workflow.json`) and only run pre-merge. Checkpoint 13 validates this gate.
- The smoke test is intentionally run on a trivial change to minimize risk.
- The default branch is read from `.opencode/workflow.json` → `project.defaultBranch`. It is `master` for this repo but may differ in other projects.
