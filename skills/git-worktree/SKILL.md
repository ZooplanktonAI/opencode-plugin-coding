---
name: git-worktree
description: Create and manage isolated git worktrees for parallel development. Set up before orchestrate, clean up after merge.
---

# Git Worktree

Manage isolated git worktrees for the multi-agent workflow. Each agent (core-coder, core-reviewer-primary, core-reviewer-secondary) works in its own worktree to avoid conflicts.

---

## When to Activate

- Before `orchestrate` — ensure worktrees exist
- After merge — clean up worktree state
- User asks to set up or reset worktrees

---

## Worktree Layout

| Agent | Path | Purpose |
|-------|------|---------|
| core-coder | `.worktrees/core-coder` | Implementation workspace |
| core-reviewer-primary | `.worktrees/core-reviewer-primary` | Code review with full verification |
| core-reviewer-secondary | `.worktrees/core-reviewer-secondary` | Code review with full verification |

Normal reviewers do **not** need worktrees — they use `gh pr diff` (read-only).

---

## Setup

### Create worktrees (idempotent)

```bash
ls .worktrees/core-coder 2>/dev/null || git worktree add --detach .worktrees/core-coder
ls .worktrees/core-reviewer-primary 2>/dev/null || git worktree add --detach .worktrees/core-reviewer-primary
ls .worktrees/core-reviewer-secondary 2>/dev/null || git worktree add --detach .worktrees/core-reviewer-secondary
```

### Ensure .gitignore entry

`.worktrees/` must be in `.gitignore`. The `/init` command handles this automatically.

### Install dependencies (if needed)

After creating a new worktree, install dependencies:

```bash
cd .worktrees/core-coder && <packageManager> install
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
git -C .worktrees/core-coder checkout --detach HEAD
git -C .worktrees/core-reviewer-primary checkout --detach HEAD
git -C .worktrees/core-reviewer-secondary checkout --detach HEAD
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
