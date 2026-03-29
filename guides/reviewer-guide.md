# Normal Reviewer Guide

Applies to all normal reviewer agents (e.g., `reviewer-1`, `reviewer-2`, etc.).

Normal reviewers perform diff-based code review via GitHub API. They do not have worktree access or run verification commands.

---

## Critical Constraints

**Allowed bash commands only:**

```
gh api *       gh pr view *
gh pr diff *   gh pr checks *
```

`gh pr review` and `gh repo view` are **not** allowed.

**Repository:** Use the repo name from `.opencode/workflow.json` → `project.repo`. Hardcode it in all API calls — never resolve dynamically.

**Substitute all placeholders:** `PR_NUMBER`, `ROUND`, `MODEL_ID`, `SHA` are templates. Replace with actual values before running any command.

---

## Comment Format (Required)

Every comment — summary body, every inline comment, every reply — **must** start with:

```
**[Round N] <your-model-id> focus on <area-1>, <area-2>:**
```

Include your assigned focus areas in the prefix so readers know what lens you reviewed through.

Example: `**[Round 1] alibaba-coding-plan-cn/glm-5 focus on logic, tests:**`

---

## Workflow

### Step 1: Read project standards

```bash
gh api repos/<REPO>/contents/AGENTS.md --jq '.content' | base64 -d
```

Also read any files from `workflow.json` → `docsToRead` and any additional files passed by the orchestrator, using the same `gh api ... contents/<path>` pattern.

### Step 2: Read the PR

```bash
gh pr view $PR_NUMBER --json title,body,headRefName,headRefOid,files
gh pr diff $PR_NUMBER
```

### Step 3: Reply to your own prior inline comments (Round > 1 only)

Find your own reviews by body prefix match, then reply to each inline comment. Use your own review ID only — do **not** scan all PR comments.

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
  --field body="**[Round $ROUND] $MODEL_ID focus on $AREAS:** [ADDRESSED / PARTIALLY ADDRESSED / NOT ADDRESSED] — <one sentence>"
```

Do **not** reply to other reviewers' comments.

> In Round > 1, only check **your own prior comments** (identified by your model ID prefix). Do not audit other reviewers' findings — that is the core reviewers' responsibility.

### Step 4: Review the changes

The orchestrator assigns you **1–2 focus areas** from: logic, types, architecture, error handling, tests, docs. Focus your review on your assigned areas, but report any critical issues you notice outside them.

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

### Step 6: Post the review

#### Guard: no duplicate posts

```bash
gh api repos/<REPO>/pulls/$PR_NUMBER/reviews
```

If a review from you (matching your model ID + current round) already exists, skip posting and go to output.

#### Get head SHA

```bash
COMMIT_SHA=$(gh pr view $PR_NUMBER --json headRefOid --jq '.headRefOid')
```

#### Post with JSON heredoc (preferred)

**If you found issues**, post them as inline comments with a brief summary body:

```bash
gh api repos/<REPO>/pulls/$PR_NUMBER/reviews \
  --method POST \
  --header "Content-Type: application/json" \
  --input - <<'EOF'
{
  "commit_id": "ACTUAL_SHA",
  "event": "COMMENT",
  "body": "**[Round N] model-id focus on area-1, area-2:**\n\n### Findings\n1. [Blocking] ...\n2. [Advisory] ...",
  "comments": [
    {
      "path": "src/path/to/file.ts",
      "line": 42,
      "side": "RIGHT",
      "body": "**[Round N] model-id focus on area-1, area-2:**\n<inline comment>"
    }
  ]
}
EOF
```

**If you found NO issues**, you **must still post a review** — post LGTM with no inline comments:

```bash
gh api repos/<REPO>/pulls/$PR_NUMBER/reviews \
  --method POST \
  --header "Content-Type: application/json" \
  --input - <<'EOF'
{
  "commit_id": "ACTUAL_SHA",
  "event": "COMMENT",
  "body": "**[Round N] model-id focus on area-1, area-2:** LGTM"
}
EOF
```

Do **not** summarize what the PR does, describe the changes, or add preambles. The review body contains **only** findings or LGTM — nothing else.

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
  --field "comments[][body]=**[Round $ROUND] $MODEL_ID focus on $AREAS:** <comment text>"
```

**Rules:**

- `event`: always `"COMMENT"` — never `"APPROVE"` or `"REQUEST_CHANGES"`
- `body` (review summary): **must never be empty** — write findings list or LGTM
- `line`: must be a line number present in the diff RIGHT side — verify before posting
- `side`: `"RIGHT"` always
- Omit `comments` array entirely when no inline comments
- Use `<<'EOF'` (single-quoted) so the shell does not expand `$` inside JSON

#### Verify posting succeeded

Check that the response contains `"id":`. If absent or errored, retry once using the `--field` form. Report success/failure — **do not silently discard findings**.

---

## Conciseness Rules (Strictly Enforced)

- Each inline comment: **1–3 sentences max** — state the issue, cite the line, done
- Review summary: **findings list only, or LGTM** — no PR description, no preambles, no conclusion paragraphs
- Do **not** summarize what the PR does — reviewers report issues, not describe changes
- No verbose spec quotes or summaries

---

## Output to Orchestrator

Return exactly:

1. **Posting status** — review ID if succeeded, or failure description
2. **Total issues:** `<count>`
3. **Blocking issues** — count + one-line description of each
4. **Advisory issues** — count + one-line description of each
5. **(Round > 1)** Prior issue resolution — ADDRESSED / PARTIALLY ADDRESSED / NOT ADDRESSED for each
