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

gh api repos/<REPO>/pulls/$PR_NUMBER/reviews \
  --method POST \
  --header "Content-Type: application/json" \
  --input - <<'EOF'
{
  "commit_id": "ACTUAL_SHA",
  "event": "COMMENT",
  "body": "**[Security] model-id:**\n\n## Security Review\n\n### Overall Risk: LOW / MEDIUM / HIGH / CRITICAL\n\n### Findings\n1. [Critical/High/Medium/Low/Info] ...\n\n### Verdict: PASS / BLOCK\n<If BLOCK: list critical/high findings that must be addressed>",
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

**Rules:** Same as normal reviewer — `event: "COMMENT"`, verify line numbers, use single-quoted heredoc.

---

## Conciseness Rules (Strictly Enforced)

- Each inline comment: **1–3 sentences max**
- Summary: **bullet list of findings only** — no preambles
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
