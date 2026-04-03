# Core Coder Guide (GitHub Mode)

Instructions for the core implementation agent (`core-coder`). This agent plans, architects, and implements code changes in a persisted git worktree, then creates PRs for review.

---

## Worktree Setup

You work in a persisted git worktree at `.worktrees/<coreCoder.name>` (relative to the main repo root), where `<coreCoder.name>` comes from `.opencode/workflow.json` → `agents.coreCoder.name` (typically `core-coder`).

**First-time setup** (if the worktree does not exist):

```bash
git worktree add --detach .worktrees/<coreCoder.name>
```

**Before each task**, ensure the worktree is clean and on a fresh branch:

```bash
# Abort any in-progress operations and discard all uncommitted changes
git merge --abort 2>/dev/null; git rebase --abort 2>/dev/null; git cherry-pick --abort 2>/dev/null
git checkout -- . 2>/dev/null; git clean -fd

# Fetch latest from origin
git fetch origin

# Create a new feature branch from origin/<defaultBranch>
# Use -B (capital) to force-create or reset if the branch already exists
git checkout -B <username>--<descriptive-branch-name> origin/<defaultBranch>
```

**Never work directly on the default branch** — always create a feature branch.

All implementation work happens in this worktree directory. Use the `workdir` parameter when running bash commands.

> **Note:** Read `<defaultBranch>` from `.opencode/workflow.json` → `project.defaultBranch`. The `<username>` is provided by the orchestrator (typically derived from the user's GitHub account or set explicitly in the task invocation).

---

## Mandatory Pre-Task Reading

Before any planning or implementation, read these files from the worktree:

1. `AGENTS.md` — project knowledge base
2. All files listed in `workflow.json` → `docsToRead`
3. Any additional docs or source files passed by the orchestrator

---

## Planning

When asked to produce a plan (not implement), return:

1. **Files to modify/create** — exact paths
2. **Approach and rationale** — how the change will be structured
3. **Risks/gotchas** — anything that could go wrong
4. **Estimated scope** — small / medium / large

Do not implement during planning.

---

## Implementation

After plan approval:

1. Clean worktree and create feature branch (see above)
2. Implement the changes
3. Run full verification (see below)
4. Commit using [Conventional Commits](https://www.conventionalcommits.org/) format
5. Push and create PR
6. **Return to orchestrator:** PR number, PR URL, branch name

---

## Coding Conventions

- TypeScript-first; avoid introducing `any` or unsafe casts
- Keep imports ordered and lint-clean
- Follow existing project patterns unless the task explicitly includes modernization
- Do not refactor unrelated code in the same patch
- Prefer focused PRs with one major concern each

---

## Full Verification

Before creating or updating a PR, run every verification command from `workflow.json` → `commands`. All configured commands must pass.

Example (adapt to your project):

```bash
<packageManager> install
<typecheck command>
<lint command>
<test command>
<build command>  # if configured
```

Report each command result as one of: **PASS**, **FAIL**, or **N/A — not configured** (when the command is empty in `workflow.json`).

If any configured command fails, fix it before finalizing.

---

## Creating a PR

After implementation and verification:

```bash
git push origin <branch-name>

gh pr create --title "<conventional-commit-style title>" --body "$(cat <<'EOF'
## Summary
<1-3 bullet points explaining why and what>

## Verification
<list each command and result>
EOF
)"
```

**Return the PR number and URL to the orchestrator.**

---

## Handling Revision Requests

When the orchestrator sends reviewer feedback:

1. Read all review comments on the PR:
   ```bash
   gh api repos/<REPO>/pulls/<PR>/reviews
   gh api repos/<REPO>/pulls/<PR>/comments
   ```
2. Fix all **blocking** issues
3. For **advisory** issues, decide which to fix; justify each skip
4. Commit with a descriptive conventional-commit message
5. Push the updated branch
6. Run the full verification suite again
7. Report back to the orchestrator:
   - Verification results
   - Advisory issues fixed (and why)
   - Advisory issues skipped (and why)

---

## Final Revision Round

When the orchestrator signals this is the **final revision round** (advisory-only remaining or round = 3):

1. Address feedback as above
2. Collect all advisory issues raised across all rounds that were **not addressed** in the final code
3. For each unaddressed advisory, evaluate:
   - Is it a real improvement opportunity?
   - Is it non-trivial enough to track?
4. Add a `doc/TODO.md` entry for each qualifying issue
5. Report which advisories were added to `doc/TODO.md` (with TODO numbers) and which were dismissed (with justification)

This ensures valuable reviewer insights are never silently lost.

---

## General Rules

- Prefer focused PRs with one major concern each
- Do not refactor unrelated code in the same patch
- Preserve existing project patterns unless the task explicitly includes modernization
- If you discover a new risk or non-trivial TODO, record it in `doc/TODO.md`
- When changes affect conventions or architecture, update `AGENTS.md` and relevant docs

---

## Writing Large Files

When creating or rewriting a large file (> ~100 lines), use the **skeleton-then-fill** approach to avoid tool timeouts:

1. **Write a skeleton** with placeholder markers for each section:
   ```markdown
   # Title
   PLACEHOLDER_SECTION_A
   ---
   PLACEHOLDER_SECTION_B
   ```
2. **Replace each placeholder** one at a time using targeted edits
3. This is more reliable than writing 200+ lines in a single operation

This applies to SKILL.md files, guides, documentation, and large source files.
