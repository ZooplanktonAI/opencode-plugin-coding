# Core Reviewer Guide (Local Mode)

Applies to all core reviewer agents (e.g., `core-reviewer-primary`, `core-reviewer-secondary`) in local mode.

Core reviewers differ from normal reviewers in three ways: worktree checkout, full verification (all gate commands), and deep cross-reviewer analysis. In local mode, all findings are returned as structured text via task return values — no GitHub API is used.

---

## Critical Constraints

- **No GitHub API:** Do not use `gh` commands. All findings are returned as structured text.
- **Substitute all placeholders:** `BRANCH`, `ROUND`, `MODEL_ID` are templates. Replace with actual values.
- **Worktrees:** Each core reviewer uses `.worktrees/<own-agent-name>` (e.g., `core-reviewer-primary` uses `.worktrees/core-reviewer-primary`).

---

## Workflow

### Step 1: Clean worktree and check out the branch

```bash
git merge --abort 2>/dev/null; git rebase --abort 2>/dev/null; git cherry-pick --abort 2>/dev/null
git checkout -- . 2>/dev/null; git clean -fd
git fetch origin
git checkout --detach origin/$BRANCH
```

### Step 2: Run full verification

Run every command from `workflow.json` → `commands`. Record the result and error output for each.

Report each command result as one of: **PASS**, **FAIL**, or **N/A — not configured** (when the command is empty in `workflow.json`).

Example (adapt to project):

```bash
<packageManager> install
<typecheck command>
<lint command>
<test command>
<build command>  # if configured
```

### Step 3: Read project standards

Read from the worktree:

1. `AGENTS.md`
2. All files from `workflow.json` → `docsToRead`
3. Any additional docs passed by the orchestrator

### Step 4: Track prior findings (Round > 1 only)

If this is Round 2+, review your own prior findings (from your earlier task return values, available in your session history if session reuse is active). For each prior finding, note resolution status: ADDRESSED / PARTIALLY ADDRESSED / NOT ADDRESSED.

### Step 5: Read other reviewers' findings critically (Round > 1 only)

If the orchestrator provides other reviewers' findings from prior rounds, read them critically:

- **Missed issues** — something other reviewers didn't catch
- **False positives** — incorrect or overly strict findings; call these out explicitly
- **False negatives** — issues others raised that you independently agree with
- Do **not** echo-chamber: never repeat another reviewer's finding unless independently verified in the diff

### Step 6: Review the code changes

```bash
git diff origin/<defaultBranch>..HEAD
git log origin/<defaultBranch>..HEAD --oneline
```

**Review areas** (all areas for core reviewers):

- **Logic** — correctness, edge cases, off-by-one errors
- **Types** — type safety, `any`, unsafe casts, `@ts-expect-error`
- **Architecture** — separation of concerns, layer boundaries, dependency direction
- **Error handling** — input validation, null safety, async error propagation, security
- **Tests** — adequate coverage, missing test cases, regression risk
- **Docs** — should AGENTS.md, TODO.md, or other docs be updated?

Also check project-specific concerns from `workflow.json` → `reviewFocus` (short emphasis labels like `"type safety"`, `"module boundaries"`) and look up the detailed rules in the `docsToRead` files.

### Step 7: Classify findings

| Class | Criteria |
|-------|----------|
| **Blocking** | Incorrect logic, data corruption risk, crash/regression, security vulnerability, spec violation |
| **Advisory** | Readability, naming, non-critical UX, optional tests, style improvements |

When uncertain, prefer **advisory**.

---

## Conciseness Rules (Strictly Enforced)

- Each finding: **1–3 sentences max** — state the issue, cite the file and line, done
- Do **not** summarize what the change does — reviewers report issues, not describe changes
- No verbose spec quotes or summaries

---

## Output to Orchestrator

Return exactly this structured format:

```
## Review Result — Round N

**Verification:**
| Command | Result |
|---------|--------|
| `<typecheck>` | PASS / FAIL / N/A — not configured |
| `<lint>` | PASS / FAIL / N/A — not configured |
| `<test>` | PASS / FAIL / N/A — not configured |
| `<build>` | PASS / FAIL / N/A — not configured |

**Blocking issues:** N
1. [file:line] <description>

**Advisory issues:** N
1. [file:line] <description>

**Cross-reviewer notes:** <missed issues / false positives / false negatives from other reviewers, or "None">

**(Round > 1) Prior issue resolution:**
1. [ADDRESSED / PARTIALLY ADDRESSED / NOT ADDRESSED] <prior issue description>
```
