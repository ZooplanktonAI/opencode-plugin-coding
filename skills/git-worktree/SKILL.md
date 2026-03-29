---
name: git-worktree
description: Create and manage isolated git worktrees for parallel development. Set up before orchestrate, clean up after merge.
---

# Git Worktree

Manage isolated git worktrees for the multi-agent workflow. Each agent works in its own worktree to avoid conflicts. Read agent names from `workflow.json` → `agents`.

---

## When to Activate

- Before `orchestrate` — ensure worktrees exist
- After merge — clean up worktree state
- User asks to set up or reset worktrees

---

## Worktree Layout

| Agent | Path | Purpose |
|-------|------|---------|
| `coreCoder` | `.worktrees/<coreCoder>` | Implementation workspace |
| Each name in `coreReviewers` | `.worktrees/<name>` | Code review with full verification |

Normal reviewers do **not** need worktrees — they use `gh pr diff` (read-only).

---

## Setup

### Create worktrees (idempotent)

Read `agents.coreCoder` and `agents.coreReviewers` from `workflow.json`. For each, create a worktree if it doesn't exist:

```bash
# For coreCoder:
ls .worktrees/<coreCoder> 2>/dev/null || git worktree add --detach .worktrees/<coreCoder>

# For each name in coreReviewers:
ls .worktrees/<name> 2>/dev/null || git worktree add --detach .worktrees/<name>
```

### Ensure .gitignore entry

`.worktrees/` must be in `.gitignore`. The `/zooplankton-coding-init` command handles this automatically.

### Install dependencies (if needed)

After creating a new worktree, install dependencies:

```bash
cd .worktrees/<agent-name> && <packageManager> install
```

Core reviewer worktrees also need dependencies for running verification commands.

---

## Before Each Task

Clean and sync each worktree before use:

```bash
cd .worktrees/<agent-name>

# Abort any in-progress operations
git merge --abort 2>/dev/null
git rebase --abort 2>/dev/null
git cherry-pick --abort 2>/dev/null

# Discard uncommitted changes
git checkout -- . 2>/dev/null
git clean -fd

# Fetch latest
git fetch origin
```

For **core-coder**, create a feature branch:

```bash
git checkout -B <username>--<branch-name> origin/<defaultBranch>
```

For **core-reviewers**, check out the PR branch:

```bash
git checkout --detach origin/<pr-branch>
```

---

## After Merge

Detach all worktrees so the feature branch can be deleted:

```bash
# For coreCoder:
git -C .worktrees/<coreCoder> checkout --detach HEAD

# For each name in coreReviewers:
git -C .worktrees/<name> checkout --detach HEAD
```

Then delete the branch locally and remotely (handled by the `orchestrate` skill).

---

## Troubleshooting

### Worktree locked

```bash
git worktree unlock .worktrees/<name>
```

### Worktree directory exists but is not a valid worktree

```bash
git worktree remove .worktrees/<name> --force
git worktree add --detach .worktrees/<name>
```

### Cannot delete branch because it's checked out in a worktree

Detach the worktree first (see "After Merge" above).

---

## Rules

- **Never work on the default branch** in any worktree — always create or checkout a feature/PR branch
- **Always clean before use** — stale state from a previous task can cause subtle bugs
- **Worktrees are persistent** — don't recreate them between tasks, just clean and re-checkout
- **`.worktrees/` is always gitignored** — never commit worktree directories
