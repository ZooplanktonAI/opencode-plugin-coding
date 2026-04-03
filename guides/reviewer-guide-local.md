# Normal Reviewer Guide (Local Mode)

Applies to all normal reviewer agents (e.g., `reviewer-glm`, `reviewer-minimax`, etc.) in local mode.

Normal reviewers perform diff-based code review using git commands and the `read` tool for file access. No GitHub API (`gh`) is used. All findings are returned as structured text via task return values.

---

## Critical Constraints

**Allowed bash commands only:**

```
git diff *    git log *
```

No `gh` commands are available. Use the `read` tool to access file contents directly from the filesystem.

**Substitute all placeholders:** `BRANCH`, `ROUND`, `MODEL_ID` are templates. Replace with actual values before running any command.

---

## Workflow

### Step 1: Read project standards

Use the `read` tool to read file contents directly:

- `AGENTS.md`
- All files from `workflow.json` → `docsToRead`
- Any additional files passed by the orchestrator

> **Step budget:** Read AGENTS.md and `docsToRead` files once and move on. Fetch each document a single time — do not re-fetch or loop over already-read files. The diff (Step 2) is your primary source. Once you have enough context to assess the changes, proceed immediately to Step 2.

### Step 2: Read the changes

```bash
git diff origin/<defaultBranch>..origin/$BRANCH
git log origin/<defaultBranch>..origin/$BRANCH --oneline
```

To read specific files in detail, use the `read` tool with the file path.

### Step 3: Track prior findings (Round > 1 only)

If this is Round 2+, review your own prior findings (from your earlier task return values, available in your session history if session reuse is active). For each prior finding, note resolution status: ADDRESSED / PARTIALLY ADDRESSED / NOT ADDRESSED.

> In Round > 1, only check **your own prior findings**. Do not audit other reviewers' findings — that is the core reviewers' responsibility.

### Step 4: Review the changes

The orchestrator assigns you **1–2 focus areas** from: logic, types, architecture, error handling, tests, docs. Focus your review on your assigned areas, but report any critical issues you notice outside them.

If the orchestrator provides a **`reviewFocus`** list (from `workflow.json`), use those as an additional lens. These are short emphasis labels (e.g., `"type safety"`, `"mongoose import patterns"`, `"module boundaries"`) that highlight what the project cares most about. Look up the detailed rules in `AGENTS.md` or `docsToRead` files. Apply them alongside your assigned areas, not instead of them.

General review checklist:

- **Correctness** — logic errors, edge cases, off-by-one
- **Type safety** — `any`, unsafe casts, missing types
- **Bugs** — null/undefined risks, async issues, error handling
- **Security** — input validation, injection, auth checks
- **Architecture** — boundary violations, dependency direction
- **Style** — naming, consistency with project conventions

### Step 5: Classify findings

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

**Blocking issues:** N
1. [file:line] <description>

**Advisory issues:** N
1. [file:line] <description>

**(Round > 1) Prior issue resolution:**
1. [ADDRESSED / PARTIALLY ADDRESSED / NOT ADDRESSED] <prior issue description>
```
