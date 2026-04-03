# Core Reviewer Guide (GitHub Mode)

Applies to all core reviewer agents (e.g., `core-reviewer-primary`, `core-reviewer-secondary`).

Core reviewers differ from normal reviewers in three ways: worktree checkout, full verification (all gate commands), and deep cross-reviewer analysis.

---

## Critical Constraints

- **Repository:** Use the repo name from `.opencode/workflow.json` → `project.repo`. Hardcode it in all `gh api` calls — never resolve dynamically.
- **Substitute all placeholders:** `PR_NUMBER`, `BRANCH`, `ROUND`, `MODEL_ID`, `SHA` are templates. Replace with actual values before running any command.
- **Worktrees:** Each core reviewer uses `.worktrees/<own-agent-name>` (e.g., `core-reviewer-primary` uses `.worktrees/core-reviewer-primary`).

---

## Comment Format (Required)

Every comment — summary body, every inline comment, every reply — **must** start with:

```
**[Round N] <your-model-id>:**
```

Example: `**[Round 2] github-copilot/claude-sonnet-4.6:**`

---

## Workflow

### Step 1: Clean worktree and check out the PR branch

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

### Step 4: Reply to your own prior inline comments (Round > 1 only)

Find your own reviews by body prefix match, then reply to each inline comment with resolution status. Use your own review ID only — this is race-safe.

```bash
# Find your own review IDs
gh api repos/<REPO>/pulls/$PR_NUMBER/reviews \
  --jq '[.[] | select(.body | test("^\\*\\*\\[Round [0-9]+\\] YOUR_MODEL_ID:")) | .id]'

# For each review ID, fetch your inline comments
gh api repos/<REPO>/pulls/$PR_NUMBER/reviews/$REVIEW_ID/comments \
  --jq '[.[] | {id, path, line, body}]'

# Reply to each
gh api repos/<REPO>/pulls/$PR_NUMBER/comments/$COMMENT_ID/replies \
  --method POST \
  --field body="**[Round $ROUND] $MODEL_ID:** [ADDRESSED / PARTIALLY ADDRESSED / NOT ADDRESSED] — <one sentence>"
```

Do **not** reply to other reviewers' comments.

### Step 5: Read all other reviewers' comments critically (every round)

```bash
gh api repos/<REPO>/pulls/$PR_NUMBER/reviews
gh api repos/<REPO>/pulls/$PR_NUMBER/comments
```

Read critically:

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

### Step 8: Post the review

#### Get head SHA

```bash
COMMIT_SHA=$(gh pr view $PR_NUMBER --json headRefOid --jq '.headRefOid')
```

#### Post with JSON heredoc (preferred — most reliable)

**If you found issues**, post them as inline comments with verification results and findings:

```bash
gh api repos/<REPO>/pulls/$PR_NUMBER/reviews \
  --method POST \
  --header "Content-Type: application/json" \
  --input - <<'EOF'
{
  "commit_id": "ACTUAL_SHA",
  "event": "COMMENT",
  "body": "**[Round N] model-id:**\n\n### Verification\n| Command | Result |\n|---|---|\n| `<typecheck>` | PASS / FAIL / N/A — not configured |\n| `<lint>` | PASS / FAIL / N/A — not configured |\n| `<test>` | PASS / FAIL / N/A — not configured |\n| `<build>` | PASS / FAIL / N/A — not configured |\n\n### Findings\n1. [Blocking] ...\n2. [Advisory] ...",
  "comments": [
    {
      "path": "src/path/to/file.ts",
      "line": 42,
      "side": "RIGHT",
      "body": "**[Round N] model-id:**\n<inline comment>"
    }
  ]
}
EOF
```

**If you found NO issues**, you **must still post a review** — post verification results + LGTM:

```bash
gh api repos/<REPO>/pulls/$PR_NUMBER/reviews \
  --method POST \
  --header "Content-Type: application/json" \
  --input - <<'EOF'
{
  "commit_id": "ACTUAL_SHA",
  "event": "COMMENT",
  "body": "**[Round N] model-id:**\n\n### Verification\n| Command | Result |\n|---|---|\n| `<typecheck>` | PASS / FAIL / N/A — not configured |\n| `<lint>` | PASS / FAIL / N/A — not configured |\n| `<test>` | PASS / FAIL / N/A — not configured |\n| `<build>` | PASS / FAIL / N/A — not configured |\n\nLGTM"
}
EOF
```

Do **not** summarize what the PR does, describe the changes, or add preambles. The review body contains **only** verification results + findings or LGTM — nothing else.

#### Alternative: Post with --field flags

```bash
gh api repos/<REPO>/pulls/$PR_NUMBER/reviews \
  --method POST \
  --field commit_id="$COMMIT_SHA" \
  --field event="COMMENT" \
  --field body="<review body>" \
  --field "comments[][path]=src/path/to/file.ts" \
  --field "comments[][line]=42" \
  --field "comments[][side]=RIGHT" \
  --field "comments[][body]=**[Round $ROUND] $MODEL_ID:** <comment text>"
```

**Rules:**

- `event`: always `"COMMENT"` — never `"APPROVE"` or `"REQUEST_CHANGES"`
- `body` (review summary): **must never be empty** — write verification results + findings list or LGTM
- `line`: must be a line number present in the **diff hunk RIGHT side** — see validation step below
- `side`: `"RIGHT"` always
- Omit `comments` entirely when no inline comments
- Use `<<'EOF'` (single-quoted) so the shell does not expand `$` inside JSON

#### Validate line numbers before posting

For each inline comment, confirm the target line appears in the diff. Run `git diff origin/<defaultBranch>..HEAD` in your worktree and find the file's hunk. Only lines with a `+` prefix (added) or ` ` prefix (context) on the RIGHT side are valid targets. Lines with `-` prefix (removed) are LEFT-side only and will cause a posting error. If the line number is not in any hunk, the GitHub API will reject the comment — **do not guess line numbers from the full file**; use only lines visible in the diff output.

#### Verify posting succeeded

Check that the response contains `"id":`. If absent or errored, retry once using the `--field` form. Report success/failure — **do not silently discard findings**.

---

## Conciseness Rules (Strictly Enforced)

- Each inline comment: **1–3 sentences max** — state the issue, cite the line, done
- Review summary: **verification results + findings list, or verification results + LGTM** — no PR description, no preambles, no conclusion paragraphs
- Do **not** summarize what the PR does — reviewers report issues, not describe changes
- No verbose spec quotes or summaries
- Duplicate-post guard: check if a review from you for the current round already exists before posting

---

## Output to Orchestrator

Return exactly:

1. **Verification results** — pass/fail for each command
2. **Posting status** — review ID if succeeded, or failure description
3. **Total issues:** `<count>`
4. **Blocking issues** — count + one-line description of each
5. **Advisory issues** — count + one-line description of each
6. **Cross-reviewer notes** — missed issues / false positives / false negatives from other reviewers
7. **(Round > 1)** Prior issue resolution — ADDRESSED / PARTIALLY ADDRESSED / NOT ADDRESSED for each
