---
name: orchestrate
description: Full multi-agent software development workflow — implement, review, merge, and retrospective — with parallel reviewer coordination and adaptive scoring.
---

# Orchestrate

The central orchestration skill. You (the Build agent) coordinate the full software development lifecycle: plan → implement → review → merge → retrospect.

You dispatch subagents (`@<coreCoder.name>`, `@<coreReviewers[].name>`, `@<reviewers[].name>`, optionally `@<securityReviewers[].name>`) and manage the flow between them. All project-specific settings come from `.opencode/workflow.json`.

Consolidates the best patterns from app-annie (template-driven), admin (non-blocking reviewer wait), and stone-guardian (reviewer scoring, conciseness rules, JSON heredoc posting).

---

## When to Activate

- User assigns a coding task (feature, bug fix, refactor)
- User says "orchestrate", "implement", "build this"
- After a `plan` skill produces an approved plan
- Any task that requires implementation + review

---

## Configuration

Read `.opencode/workflow.json` at the start of every orchestration. Key fields:

- `project.repo` — GitHub repo (e.g. `Org/repo-name`). Hardcode in all `gh` commands.
- `project.defaultBranch` — typically `main` or `master`
- `commands.*` — verification commands (typecheck, lint, test, build)
- `agents.coreCoder` — `{ name, model }` for the core implementation agent
- `agents.coreReviewers` — array of `{ name, model }` for core reviewers (blocking quorum)
- `agents.reviewers` — array of `{ name, model }` for normal reviewers (non-blocking)
- `agents.securityReviewers` — array of `{ name, model }` for security reviewers (empty = disabled)
- `docsToRead` — files all agents must read before working
- `reviewFocus` — array of project-specific review emphasis strings (passed to reviewers)

---

## Worktree Setup (One-Time)

Before the first task, ensure persisted worktrees exist for the core-coder and all core reviewers:

```bash
# Core coder worktree
ls .worktrees/core-coder 2>/dev/null || git worktree add --detach .worktrees/core-coder

# Core reviewer worktrees — create one per entry in agents.coreReviewers
# Example for the default 2-reviewer config:
ls .worktrees/core-reviewer-primary 2>/dev/null || git worktree add --detach .worktrees/core-reviewer-primary
ls .worktrees/core-reviewer-secondary 2>/dev/null || git worktree add --detach .worktrees/core-reviewer-secondary
```

Read `agents.coreCoder.name` and `agents.coreReviewers` from `workflow.json`. Create a worktree at `.worktrees/<name>` for the core coder and each core reviewer entry.

`.worktrees/` must be in `.gitignore`. The `/init` command handles this automatically.

---

## Small-Change Fast Path

If the change is < 20 lines, straightforward, and low-risk, skip Phases 1–2:

1. Edit files directly
2. Create branch: `git checkout -b <username>--<name>`
3. Commit (Conventional Commits) and push
4. `gh pr create`
5. Run Phase 3 (all reviewers in parallel)
6. Run Phase 4 (evaluate)
   - Blocking issues → hand off to `@<coreCoder.name>`; continue review loop
   - Advisory-only → orchestrator addresses directly
7. Post pre-merge summary → ask user to approve → merge

---

## Phase 1: Setup

1. Read `.opencode/workflow.json`, `AGENTS.md`, and all `docsToRead` files
2. Run cleanup policy (see Cleanup Policy section below)
3. Check for stale plans and report alerts
4. Verify worktrees exist (create if missing)
5. If a plan file exists at `.opencode/plans/<branch>.md`, read it. Otherwise, invoke `@<coreCoder.name>` to produce a plan first (see Phase 2 planning step).

---

## Phase 2: Implement

### 2a. Planning (if no plan exists)

Invoke `@<coreCoder.name>` with the planning template (see Invocation Templates). It must return a structured plan — files to change, approach, risks, scope. **No implementation yet.**

Present the plan to the user for approval. If user requests changes, re-invoke `@<coreCoder.name>` with feedback.

Write the approved plan to `.opencode/plans/<branch>.md` and set status to `not_started`.

### 2b. Implementation

1. Set plan status to `in_progress`
2. Invoke `@<coreCoder.name>` with the implementation template
3. Core-coder must work in `.worktrees/<coreCoder.name>`, create a feature branch from `origin/<defaultBranch>`, implement, run all verification commands, commit, push, and create a PR
4. Core-coder returns: **PR number, PR URL, branch name**
5. Record these for Phase 3

---

## Phase 3: Review

### 3a. Security Review (if configured)

If `workflow.json` → `agents.securityReviewers` is non-empty:

1. Invoke each `@<entry.name>` in `agents.securityReviewers` with the PR number (see `guides/security-reviewer-guide.md`)
2. If any verdict is **BLOCK**: send critical/high findings to `@<coreCoder.name>` for fixes before proceeding
3. If all verdicts are **PASS**: continue to 3b

### 3b. Parallel Code Review

Invoke **all reviewers in a single parallel message** (one Task call per reviewer).

Read `agents.coreReviewers` and `agents.reviewers` arrays from `workflow.json`. Each entry has `name` (the agent name to invoke with `@<name>`) and `model` (the model ID to pass as `$MODEL_ID` in the template).

**Core reviewers** (blocking quorum — must wait for all):

For each entry in `agents.coreReviewers`, invoke `@<entry.name>`:
- Assign worktree `.worktrees/<entry.name>`
- Pass model ID `<entry.model>`

**Normal reviewers** (non-blocking — include if available):

For each entry in `agents.reviewers`, invoke `@<entry.name>`:
- Pass model ID `<entry.model>`
- Assign 1-2 review areas via adaptive round-robin (see Reviewer Assignment Strategy)

Each reviewer follows their respective guide (`guides/core-reviewer-guide.md` or `guides/reviewer-guide.md`).

### 3c. Collect Results (Non-Blocking Wait)

**Proceed to Phase 4 as soon as both core reviewers have returned results.** Include results from any normal reviewers that have already completed; treat non-returned normal reviewers as having raised no issues for that round.

This is the "admin-style" non-blocking wait — core reviewers form the quorum, normal reviewers contribute opportunistically.

---

## Phase 4: Evaluate and Address

Count unique blocking and advisory issues across all reviewers.

| Condition | Action |
|-----------|--------|
| No issues at all | Post pre-merge summary → ask user → merge |
| Blocking issues exist, round < 3 | Increment round; send all feedback to `@<coreCoder.name>`; if new round = 3 add final-round signal; go to Phase 3 |
| Advisory-only (no blocking), round < 3 | **Always final round.** Increment round; send advisories to `@<coreCoder.name>` with final-round signal; go to Phase 3 |
| Round >= 3 | Stop. If previous round was blocking (not advisory-only), send final-round signal to `@<coreCoder.name>` for TODO.md. Post pre-merge summary → ask user whether to merge or handle manually |

**Critical rules:**
- **Never merge without explicit user confirmation.**
- **Always post the pre-merge PR summary comment before asking the user to merge.**

### Address Feedback

When sending feedback to `@<coreCoder.name>`, use the revision template (see Invocation Templates). Core-coder must:

1. Fix all blocking issues
2. Address advisory issues at discretion (justify skips)
3. On **final round**: evaluate all unaddressed advisories for `doc/TODO.md`
4. Commit, push, re-run all verification commands
5. Return results to orchestrator

---

## Phase 5: Retrospective

After merge, produce a retrospective:

1. **Write retrospective file** to `.opencode/retrospectives/<branch>.md` using `templates/retrospective.md`
2. **Update reviewer knowledge** — write/merge scores into `.opencode/reviewer-knowledge.json` (see Reviewer Assignment Strategy)
3. **Propose AGENTS.md updates** — if the task revealed new gotchas, conventions, or architecture patterns, suggest changes as a diff. The user reviews and applies manually.
4. **Set plan status to `completed`**
5. **Run cleanup** (see Cleanup Policy)

### Reviewer Scoring (for retrospective)

Score each reviewer on their contribution quality:

| Score | Meaning |
|-------|---------|
| 3 stars | Found at least one **blocking** issue that was valid and fixed |
| 2 stars | Found only **advisory** issues that were valid and acted on |
| 1 star | Participated but all findings were invalid, duplicates, or noise |
| 0 | Did not post a review (technical failure, timeout, etc.) |

---

## Round Tracking

- Round starts at 1 (first review = Round 1)
- Increment each time you send core-coder back for revisions
- Maximum round = 3
- Advisory-only rounds are always final — core-coder must evaluate unaddressed advisories for `doc/TODO.md`
- On the final round, include the final-round signal in the core-coder invocation

---

## Reviewer Assignment Strategy

### Review Areas

Canonical areas (defined in plugin, NOT per-project config):

- **logic** — correctness, edge cases
- **types** — type safety, unsafe casts
- **architecture** — separation of concerns, boundaries
- **error handling** — input validation, null safety, security
- **tests** — coverage, regression risk
- **docs** — AGENTS.md, README, inline docs

### Assignment Rules

- **Core reviewers:** always review **all 6 areas**
- **Normal reviewers:** assigned **1–2 areas** each via adaptive round-robin

### Round-Robin with Adaptive Weighting

1. **Baseline:** randomly assign 1–2 areas to each normal reviewer, ensuring all 6 areas are covered across the pool
2. **Adaptation:** if `.opencode/reviewer-knowledge.json` exists, weight the assignment:
   - Read per-model, per-area historical scores
   - Models with higher scores for an area are more likely to be assigned that area
   - Keep assignment **stochastic** (soft weighting) — not deterministic
3. **Fallback:** if no knowledge file exists, use pure random round-robin

### Knowledge File Format

`.opencode/reviewer-knowledge.json`:

```json
{
  "models": {
    "alibaba-coding-plan-cn/glm-5": {
      "areas": {
        "logic": { "totalScore": 12, "reviewCount": 5 },
        "types": { "totalScore": 8, "reviewCount": 4 }
      }
    }
  },
  "lastUpdated": "2026-03-30"
}
```

This file is gitignored. Accept loss on fresh clone.

---

## Invocation Templates

### Core-coder: Planning

```
Explore the codebase and produce a plan for:

<task description>

Read AGENTS.md and these docs first: <docsToRead list>

Include: files to modify/create, approach, risks, estimated scope (small/medium/large).
Do NOT implement — planning only.
```

### Core-coder: Implementation

```
Implement the approved plan in .worktrees/<coreCoder.name>.

Plan:
<approved plan>

Steps:
1. Clean worktree (abort in-progress ops, discard uncommitted changes)
2. git fetch origin
3. git checkout -B <username>--<branch-name> origin/<defaultBranch>
4. Implement
5. Run full verification: <commands from workflow.json>
6. Commit (Conventional Commits) and push
7. gh pr create

Return: PR number, PR URL, branch name.
```

### Core Reviewer

```
Review PR #$PR_NUMBER on branch $BRANCH. This is Round $ROUND.

Your worktree: $WORKTREE_PATH. Your model ID: $MODEL_ID.

Follow guides/core-reviewer-guide.md for the full workflow.

Additional docs to read: <docsToRead from workflow.json>
Review focus for this project: <reviewFocus from workflow.json>
Additional files relevant to this PR: <task-specific files>

Return: verification results (pass/fail each command), issue count, blocking vs advisory.
```

### Normal Reviewer

```
Review PR #$PR_NUMBER in repo <REPO>. This is Round $ROUND.
Your model ID: $MODEL_ID.
Your assigned review areas: <assigned 1-2 areas>

Follow guides/reviewer-guide.md for the full workflow.

Additional docs to read: <docsToRead from workflow.json>
Additional files relevant to this PR: <task-specific files>

Return: issue count, blocking vs advisory.
```

### Core-coder: Revisions

```
Address review feedback on PR #$PR_NUMBER (branch: $BRANCH).

Read full review comments:
  gh api repos/<REPO>/pulls/$PR_NUMBER/reviews
  gh api repos/<REPO>/pulls/$PR_NUMBER/comments

Blocking (must fix):
<list>

Advisory (fix at your discretion; justify any skipped):
<list>

[Include when advisory-only OR round = 3:]
This is the final revision round. After addressing the above, evaluate ALL
unaddressed advisories from all rounds. Add a doc/TODO.md entry for each that
is a real, non-trivial improvement. Report: which were added (with TODO numbers)
and which were dismissed (with justification).

Steps: fix → commit → push → full verification (<commands from workflow.json>).

Return: verification results, advisories fixed/skipped (with reasons),
[final round] doc/TODO.md additions and dismissals.
```

---

## Pre-Merge PR Summary

Post this as a PR comment **before** asking the user to merge. Use the JSON heredoc method for reliability:

```bash
gh pr comment $PR_NUMBER --repo <REPO> --body "$(cat <<'EOF'
## Pre-Merge PR Summary

### Purpose
<1-2 sentences>

### Review Findings

**Round N:**
| Reviewer | Blocking | Advisory |
|----------|----------|----------|
| `<model-id>` | <issues or "None"> | <issues or "None"> |

### Issues Fixed
<list, or "All issues addressed." or "N/A — no issues raised.">

### Issues Not Fixed
<unresolved blockers, skipped advisories with justification, doc/TODO.md entries.
Or "All issues addressed." or "N/A — no issues raised.">

### Reviewer Scores

| Reviewer | Round | Score | Notable Finding |
|----------|-------|-------|-----------------|
| `<model-id>` | R1 | ⭐⭐⭐ | <finding> |

### Final Verification

| Command | Result |
|---------|--------|
| `<typecheck>` | PASS / FAIL |
| `<lint>` | PASS / FAIL |
| `<test>` | PASS (N tests) / FAIL |
| `<build>` | PASS / FAIL |
EOF
)"
```

---

## Merge and Branch Cleanup

After the user approves, merge and clean up:

```bash
BRANCH=$(gh pr view $PR_NUMBER --json headRefName -q ".headRefName")
gh pr merge $PR_NUMBER --squash --admin --repo <REPO>
git checkout <defaultBranch> && git pull --ff-only origin <defaultBranch>
# Detach all worktrees (coreCoder + each core reviewer from agents.coreReviewers)
git -C .worktrees/<coreCoder.name> checkout --detach HEAD
# For each entry in agents.coreReviewers:
git -C .worktrees/<entry.name> checkout --detach HEAD
git branch -D $BRANCH
git push origin --delete $BRANCH 2>/dev/null || true
git remote prune origin
```

If `--ff-only` fails: `git reset --hard origin/<defaultBranch>`.

**Note:** For projects that require a pre-merge build (e.g., Electron apps), check the project's `AGENTS.md` for build-before-merge instructions. The orchestrator should follow project-specific merge rules when they exist.

---

## Cleanup Policy

Run at orchestration start and end:

### Plans
- Delete `.opencode/plans/*.md` files older than 7 days **only if** status is `completed`
- For plans older than 7 days with non-completed status, alert the user:
  ```
  ⚠ Stale plan: .opencode/plans/<name>.md (status: <status>, created: <date>)
  ```
- Do **not** auto-delete non-completed plans

### Retrospectives
- Delete `.opencode/retrospectives/*.md` files older than 7 days (unconditional)

### Reviewer Knowledge
- Never delete `.opencode/reviewer-knowledge.json` — it accumulates over time
- Accept that it resets on fresh clones (gitignored)
