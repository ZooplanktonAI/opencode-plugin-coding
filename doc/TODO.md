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
