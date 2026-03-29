# TODO

Tracked improvements deferred from review rounds.

---

## TODO-001: Orchestrate skill — reviewer-knowledge.json error handling guidance

**Source:** reviewer-4 advisory, PR #2 Round 1  
**Area:** skill correctness  

The orchestrate skill Phase 5 instructs agents to "write/merge scores into `.opencode/reviewer-knowledge.json`" but does not specify behavior when the file doesn't exist or contains malformed JSON. Consider adding explicit guidance:
- Create the file if it doesn't exist (start from empty `{}`)
- If malformed, back it up (e.g., `.opencode/reviewer-knowledge.json.bak`) before overwriting

**File:** `skills/orchestrate/SKILL.md`, Phase 5 / Reviewer Knowledge section

---

## TODO-002: Align comment columns in AGENTS.md tree diagram

**Source:** core-reviewer-1 (claude-sonnet-4.6) advisory, PR #3 Round 1  
**Area:** docs  

The `#` comment markers in the `AGENTS.md` repository structure tree are not column-aligned — filenames of different lengths cause the `#` to start at different columns (e.g., `SMOKE_TEST.md` vs `IMPLEMENTATION_PLAN.md` within `doc/`). Aligning all comment markers to a consistent column would improve readability.

**File:** `AGENTS.md`, Repository Structure section
