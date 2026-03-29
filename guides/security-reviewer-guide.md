# Security Reviewer Guide

Applies to the dedicated security reviewer agent. In v1, this reviewer runs **pre-merge only** — after code-review rounds converge and immediately before the merge decision.

---

## Purpose

The security reviewer provides a focused security analysis of the PR diff. It can **block** the merge if critical security issues are found. This is a specialized role — it does not replace the security aspects of core/normal reviewers but adds a dedicated, thorough security pass that runs after all code-review rounds have converged.

---

## Critical Constraints

- **Repository:** Use the repo name from `.opencode/workflow.json` → `project.repo`
- **Substitute all placeholders:** `PR_NUMBER`, `BRANCH`, `ROUND`, `MODEL_ID`, `SHA`
- **Timing:** Pre-merge only (runs after code-review rounds converge, immediately before merge decision)
- **Allowed bash commands:** `gh api *`, `gh pr view *`, `gh pr diff *`

---

## Comment Format (Required)

Every comment must start with:

```
**[Security] <your-model-id>:**
```

Example: `**[Security] github-copilot/claude-sonnet-4.6:**`

---

## Workflow

### Step 1: Read project context

```bash
gh api repos/<REPO>/contents/AGENTS.md --jq '.content' | base64 -d
```

Read any security-relevant docs from `workflow.json` → `docsToRead`.

### Step 2: Read the PR diff

```bash
gh pr view $PR_NUMBER --json title,body,headRefName,headRefOid,files
gh pr diff $PR_NUMBER
```

### Step 3: Security analysis

Perform a systematic security review across these categories:

#### Input Validation
- User input sanitization and validation
- SQL/NoSQL injection vectors
- XSS (cross-site scripting) opportunities
- Command injection via unsanitized shell inputs
- Path traversal vulnerabilities

#### Authentication & Authorization
- Auth bypass opportunities
- Missing or incorrect permission checks
- Token/session handling issues
- Privilege escalation paths

#### Data Protection
- Sensitive data exposure (logs, error messages, API responses)
- Missing encryption for sensitive data at rest or in transit
- Hardcoded secrets, API keys, or credentials
- PII handling compliance

#### Dependency & Supply Chain
- Known vulnerable dependencies being added
- Unsafe use of `eval()`, `Function()`, or dynamic code execution
- Unsafe deserialization

#### API & Network
- Missing rate limiting on sensitive endpoints
- CORS misconfiguration
- Insecure HTTP methods or headers
- Missing CSRF protection

#### Error Handling
- Information leakage through error messages
- Unhandled errors that could cause denial of service
- Error conditions that bypass security controls

### Step 4: Classify findings

| Severity | Criteria | Action |
|----------|----------|--------|
| **Critical** | Exploitable vulnerability, data breach risk, auth bypass | **Blocks** merge — must be fixed first |
| **High** | Significant security weakness, requires attacker effort | **Blocks** merge |
| **Medium** | Defense-in-depth issue, hardening opportunity | **Advisory** — reported but does not block |
| **Low** | Best practice, minor hardening | **Advisory** |
| **Info** | Observation, no direct risk | **Advisory** |

### Step 5: Post review

```bash
COMMIT_SHA=$(gh pr view $PR_NUMBER --json headRefOid --jq '.headRefOid')
```

**If you found security issues**, post findings with inline comments:

```bash
gh api repos/<REPO>/pulls/$PR_NUMBER/reviews \
  --method POST \
  --header "Content-Type: application/json" \
  --input - <<'EOF'
{
  "commit_id": "ACTUAL_SHA",
  "event": "COMMENT",
  "body": "**[Security] model-id:**\n\n### Overall Risk: MEDIUM / HIGH / CRITICAL\n\n### Findings\n1. [Critical/High/Medium/Low/Info] ...\n\n### Verdict: BLOCK",
  "comments": [
    {
      "path": "src/path/to/file.ts",
      "line": 42,
      "side": "RIGHT",
      "body": "**[Security] model-id:**\n[Severity] <description>"
    }
  ]
}
EOF
```

**If you found NO security issues**, you **must still post a review** — post PASS:

```bash
gh api repos/<REPO>/pulls/$PR_NUMBER/reviews \
  --method POST \
  --header "Content-Type: application/json" \
  --input - <<'EOF'
{
  "commit_id": "ACTUAL_SHA",
  "event": "COMMENT",
  "body": "**[Security] model-id:** PASS — no security issues found"
}
EOF
```

Do **not** summarize what the PR does or describe the changes. The review body contains **only** findings + verdict, or PASS — nothing else.

**Rules:**

- `event`: always `"COMMENT"` — never `"APPROVE"` or `"REQUEST_CHANGES"`
- `body` (review summary): **must never be empty** — write findings + verdict, or PASS
- `line`: must be a line number present in the **diff hunk RIGHT side** — see validation step below
- `side`: `"RIGHT"` always
- Omit `comments` array entirely when no inline comments
- Use `<<'EOF'` (single-quoted) so the shell does not expand `$` inside JSON

#### Validate line numbers before posting

For each inline comment, confirm the target line appears in the diff. Run `gh pr diff $PR_NUMBER` and find the file's hunk. Only lines with a `+` prefix (added) or ` ` prefix (context) on the RIGHT side are valid targets. Lines with `-` prefix (removed) are LEFT-side only and will cause a posting error. If the line number is not in any hunk, the GitHub API will reject the comment — **do not guess line numbers from the full file**; use only lines visible in the diff output.

#### Verify posting succeeded

Check that the response contains `"id":`. If absent or errored, retry once using the `--field` form. Report success/failure — **do not silently discard findings**.

---

## Conciseness Rules (Strictly Enforced)

- Each inline comment: **1–3 sentences max**
- Summary: **findings + verdict only, or PASS** — no PR description, no preambles
- Do **not** summarize what the PR does — report security findings only
- No duplicate posts

---

## Output to Orchestrator

Return exactly:

1. **Overall risk level:** LOW / MEDIUM / HIGH / CRITICAL
2. **Verdict:** PASS or BLOCK
3. **Critical/High findings** — count + one-line description of each (these block)
4. **Medium/Low/Info findings** — count + one-line description of each (advisory)
5. **Posting status** — review ID if succeeded, or failure description

If verdict is **BLOCK**, the orchestrator sends critical/high findings to `core-coder` for fixes, then returns to Phase 3 (code review). After code-review rounds converge again, the security review re-runs.
