---
name: orchestrate
description: Full multi-agent software development workflow — implement, review, merge, and retrospective — with parallel reviewer coordination and adaptive scoring.
---

# Orchestrate (GitHub Mode)

The central orchestration skill. You coordinate the full software development lifecycle: plan → implement → review → merge → retrospect.

You dispatch subagents (`@<coreCoder>`, `@<coreReviewers[i]>`, `@<reviewers[i]>`, optionally `@<securityReviewers[i]>`) and manage the flow between them. All project-specific settings come from `.opencode/workflow.json`. Agents are dynamically registered by the plugin from workflow.json — models come from `{ name, model }` objects in the agents section, permissions and prompts from the guide files.

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
- `agents.coreCoder` — `{ name, model }` object for the core implementation agent. Use `.name` as the agent name for `@<name>` invocations.
- `agents.coreReviewers` — array of `{ name, model }` objects for core reviewers (blocking quorum)
- `agents.reviewers` — array of `{ name, model }` objects for normal reviewers (non-blocking)
- `agents.securityReviewers` — array of `{ name, model }` objects for security reviewers (empty array = disabled)
- `docsToRead` — files all agents must read before working
- `reviewFocus` — array of short emphasis labels (e.g., `"type safety"`, `"module boundaries"`); reviewers look up detailed rules in `docsToRead` files

---

## TDD Integration

If `workflow.json` → `testDrivenDevelopment.enabled` is `true`, modify the invocation templates as follows during Phase 1 (Setup):

**Core-coder: Implementation template** — append this block at the end:

> You must follow the RED-GREEN-REFACTOR cycle for every task:
> 1. **RED** — write a failing test first (commit with `test:` prefix)
> 2. **GREEN** — write the minimum code to make it pass (commit with `feat:` prefix)
> 3. **REFACTOR** — clean up without breaking tests (commit with `refactor:` prefix)
>
> Load and follow the `test-driven-development` skill for detailed guidance.

**Core reviewer and normal reviewer templates** — append this note:

> TDD is enabled for this project. Verify that tests were written before implementation by checking the commit order (`test:` commits must precede implementation commits like `feat:` or `feat(<scope>):` for each feature).

---

## Worktree Setup (One-Time)

Before the first task, ensure persisted worktrees exist for the core-coder and all core reviewers:

```bash
# Core coder worktree (name from agents.coreCoder.name in workflow.json)
ls .worktrees/core-coder 2>/dev/null || git worktree add --detach .worktrees/core-coder

# Core reviewer worktrees — create one per entry in agents.coreReviewers
# Example for a 2-reviewer config (names from agents.coreReviewers[i].name):
ls .worktrees/core-reviewer-primary 2>/dev/null || git worktree add --detach .worktrees/core-reviewer-primary
ls .worktrees/core-reviewer-secondary 2>/dev/null || git worktree add --detach .worktrees/core-reviewer-secondary
```

Read `agents.coreCoder.name` and each `agents.coreReviewers[i].name` from `workflow.json`. Create a worktree at `.worktrees/<name>` for each.

`.worktrees/` must be in `.gitignore`. The `/zooplankton-coding-init` command handles this automatically.

---

## Small-Change Fast Path

If the change is < 20 lines, straightforward, and low-risk, skip Phases 1–2:

1. Edit files directly
2. Create branch: `git checkout -B <username>--<name>`
3. Commit (Conventional Commits) and push
4. `gh pr create`
5. Run Phase 3 (all reviewers in parallel)
6. Run Phase 4 (evaluate)
   - Blocking issues → hand off to `@<coreCoder>`; continue review loop
   - Advisory-only → orchestrator addresses directly
7. Post pre-merge summary → ask user to approve → merge

---

## Phase 1: Setup

1. Read `.opencode/workflow.json`, `AGENTS.md`, and all `docsToRead` files
2. Run cleanup policy (see Cleanup Policy section below)
3. Check for stale plans and report alerts
4. Verify worktrees exist (create if missing)
5. Verify a git remote named `origin` exists:
   ```bash
   git remote get-url origin
   ```
   If the command exits non-zero, **abort orchestration** with a clear error:
   > ❌ No git remote named `origin` found. The orchestrate workflow requires a GitHub repo with `origin` configured for `git fetch`, `git push`, and `gh` API operations. Run `git remote add origin <url>` first.
6. If `testDrivenDevelopment.enabled` is `true` in `workflow.json`, apply the TDD modifications from the TDD Integration section to the invocation templates used in subsequent phases.
7. If a plan file exists at `.opencode/plans/<branch>.md`, read it. Otherwise, invoke `@<coreCoder>` to produce a plan first (see Phase 2 planning step).

---

## Phase 2: Implement

### 2a. Planning (if no plan exists)

Invoke `@<coreCoder>` with the planning template (see Invocation Templates). It must return a structured plan — files to change, approach, risks, scope. **No implementation yet.**

Present the plan to the user for approval. If user requests changes, re-invoke `@<coreCoder>` with feedback.

Write the approved plan to `.opencode/plans/<branch>.md` and set status to `not_started`.

### 2b. Implementation

1. Set plan status to `in_progress`
2. Invoke `@<coreCoder>` with the implementation template
3. Core-coder must work in `.worktrees/<coreCoder.name>`, create a feature branch from `origin/<defaultBranch>`, implement, run all verification commands, commit, push, and create a PR
4. Core-coder returns: **PR number, PR URL, branch name**
5. Record these for Phase 3

---

## Phase 3: Review

### 3a. Parallel Code Review

Invoke **all reviewers in a single parallel message** (one Task call per reviewer).

Read `agents.coreReviewers` and `agents.reviewers` arrays from `workflow.json`. Each entry is a `{ name, model }` object — use `.name` for `@<name>` invocations.

**Core reviewers** (blocking quorum — must wait for all):

For each entry in `agents.coreReviewers`, invoke `@<entry.name>`:
- Assign worktree `.worktrees/<name>`

**Normal reviewers** (non-blocking — include if available):

For each entry in `agents.reviewers`, invoke `@<entry.name>`:
- Assign 1-2 review areas via adaptive round-robin (see Reviewer Assignment Strategy)

Each reviewer follows their respective guide (`guides/core-reviewer-guide.md` or `guides/reviewer-guide.md`).

### 3b. Collect Results (Non-Blocking Wait)

**Proceed to Phase 4 as soon as all core reviewers have returned results.** Include results from any normal reviewers that have already completed; treat non-returned normal reviewers as having raised no issues for that round.

This is the "admin-style" non-blocking wait — core reviewers form the quorum, normal reviewers contribute opportunistically.

**Implementation rule (important):**
- Do not block Phase 4 waiting for slow/stuck normal reviewers.
- Dispatch normal reviewers independently, but only gate on `agents.coreReviewers` entries' completion.
- If a normal reviewer task hangs/fails, retry once; if still unavailable, mark as no result for this round and continue.

### 3c. Session Reuse Across Rounds

When invoking the same reviewer agent in a subsequent round, **reuse the Task session** by passing the `task_id` returned from the previous round's invocation. This continues the subagent's conversation with full history (prior messages and tool outputs), so the reviewer retains context about their own earlier findings and can efficiently track resolution status.

**Rules:**
- Store each reviewer's `task_id` after Round 1 dispatch
- On Round 2+, pass the stored `task_id` to resume the session instead of creating a fresh one
- **Fallback:** if a resumed session fails (error, timeout, or unexpected state), discard the `task_id` and start a fresh session — include the round number and a note that the prior session was lost so the reviewer re-reads the diff
- Session reuse is **optional but recommended** — a fresh session per round also works, just with more redundant diff reading

---

## Phase 4: Evaluate and Address

Count unique blocking and advisory issues across all reviewers.

| Condition | Action |
|-----------|--------|
| No issues at all | Proceed to **Phase 4a (Security Gate)** |
| Blocking issues exist, round < 3 | Increment round; send all feedback to `@<coreCoder>`; if new round = 3 add final-round signal; go to Phase 3 |
| Advisory-only (no blocking), round < 3 | **Always final round.** Increment round; send advisories to `@<coreCoder>` with final-round signal; go to Phase 3 |
| Round >= 3 | Stop. Send final-round signal to `@<coreCoder>` for TODO.md (if not already sent in an advisory-only round). Proceed to **Phase 4a (Security Gate)** |

**Critical rules:**
- **Never merge without explicit user confirmation.**
- **Always post the pre-merge PR summary comment before asking the user to merge.**
- **Security review (Phase 4a) always runs before any merge path** — even if code review found zero issues.

### 4a. Security Gate (if configured)

This phase runs **only when code-review rounds have fully converged** — i.e., no more revision loops remain. It is the last gate before pre-merge summary and merge decision.

If `workflow.json` → `agents.securityReviewers` is empty, skip directly to pre-merge summary → ask user → merge.

If `workflow.json` → `agents.securityReviewers` is non-empty:

1. Invoke each `@<entry.name>` in `agents.securityReviewers` with the PR number (see `guides/security-reviewer-guide.md`)
2. If any verdict is **BLOCK**: send critical/high findings to `@<coreCoder>` for fixes, then return to Phase 3 (code review restarts from a new round)
3. If all verdicts are **PASS**: post pre-merge summary → ask user → merge

### Address Feedback

When sending feedback to `@<coreCoder>`, use the revision template (see Invocation Templates). Core-coder must:

1. Fix all blocking issues
2. Address advisory issues at discretion (justify skips)
3. On **final round**: evaluate all unaddressed advisories for `doc/TODO.md`
4. Commit, push, re-run all verification commands
5. Return results to orchestrator

---

## Phase 5: Retrospective

After merge, produce a retrospective:

1. **Write retrospective file** to `.opencode/retrospectives/<branch>.md` using `templates/retrospective.md`
2. **Update reviewer knowledge** — write/merge scores into `.opencode/reviewer-knowledge.json` (see Reviewer Assignment Strategy). If the file doesn't exist, create it from scratch with `{"models": {}, "lastUpdated": "<today>"}`. If the file exists but contains malformed JSON, back it up to `.opencode/reviewer-knowledge.json.bak` before overwriting.
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
   - Read per-model, per-area historical scores (model IDs come from `workflow.json` → `agents` → `<entry>.model`)
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

Your worktree: $WORKTREE_PATH.

Follow guides/core-reviewer-guide.md for the full workflow.

Additional docs to read: <docsToRead from workflow.json>
Review focus for this project: <reviewFocus from workflow.json>
Additional files relevant to this PR: <task-specific files>

Return: verification results (pass/fail each command), issue count, blocking vs advisory.
```

### Normal Reviewer

```
Review PR #$PR_NUMBER in repo <REPO>. This is Round $ROUND.
Your assigned review areas: <assigned 1-2 areas>

Follow guides/reviewer-guide.md for the full workflow.

Additional docs to read: <docsToRead from workflow.json>
Review focus for this project: <reviewFocus from workflow.json>
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
| `<build>` | PASS / FAIL / N/A |
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
# Detach all worktrees (coreCoder.name + each entry.name in agents.coreReviewers)
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
