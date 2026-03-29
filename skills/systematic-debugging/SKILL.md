---
name: systematic-debugging
description: Systematic 4-phase debugging — reproduce, hypothesize, isolate, fix — for resolving bugs, test failures, or abnormal behaviors.
---

# Systematic Debugging

A structured 4-phase approach to debugging: reproduce → hypothesize → isolate → fix. Prevents the common anti-pattern of guessing at fixes without understanding the root cause.

Inspired by the systematic-debugging skill from Superpowers.

---

## When to Activate

- A test is failing and the cause isn't obvious
- User reports a bug or unexpected behavior
- A verification command fails during orchestration
- Build errors that resist simple fixes
- User says "debug", "investigate", "figure out why"

---

## Phase 1: Reproduce

**Goal:** Get a reliable, minimal reproduction of the problem.

1. **Understand the symptom** — What exactly is failing? Error message? Wrong output? Crash?
2. **Run the failing command** — Execute and capture the full output:
   ```bash
   <failing command> 2>&1
   ```
3. **Identify the minimal trigger** — Can you reduce the input or test case to the smallest reproduction?
4. **Document the reproduction:**
   ```
   **Bug:** <one-line description>
   **Symptom:** <what happens>
   **Expected:** <what should happen>
   **Reproduction:** <exact command to reproduce>
   **Environment:** <relevant versions, OS, config>
   ```

**Do not proceed to Phase 2 until you have a reliable reproduction.** If you can't reproduce it, gather more information first.

---

## Phase 2: Hypothesize

**Goal:** Form 2–3 concrete hypotheses about the root cause.

1. **Read the error carefully** — Parse stack traces, error codes, and messages
2. **Trace the code path** — Read the source code along the execution path:
   ```bash
   # Read the file where the error originates
   # Read the callers
   # Read the data flow
   ```
3. **Form hypotheses** — List 2–3 possible causes, ranked by likelihood:
   ```
   Hypotheses:
   1. [Most likely] <description> — because <evidence>
   2. [Possible] <description> — because <evidence>
   3. [Less likely] <description> — because <evidence>
   ```
4. **Check recent changes** — Could a recent commit have introduced this?
   ```bash
   git log --oneline -20
   git diff HEAD~5..HEAD -- <relevant files>
   ```

**Do not jump to fixing.** The goal is to understand, not to patch.

---

## Phase 3: Isolate

**Goal:** Confirm which hypothesis is correct by testing each one.

For each hypothesis:

1. **Design a test** — What would confirm or disprove this hypothesis?
2. **Execute the test** — Add logging, run with different inputs, or write a targeted unit test
3. **Record the result:**
   ```
   Hypothesis 1: [CONFIRMED / DISPROVED]
   Evidence: <what you observed>
   ```

Techniques:

- **Binary search** — If the bug is in a range of commits, use `git bisect`
- **Add logging** — Temporarily add `console.log` or equivalent at key points
- **Simplify inputs** — Remove complexity until the bug disappears, then add back
- **Unit test isolation** — Write a test that directly exercises the suspected code path

**Continue until exactly one hypothesis is confirmed.** If all are disproved, return to Phase 2 with new information.

---

## Phase 4: Fix

**Goal:** Apply the correct fix and verify it resolves the issue without regressions.

1. **Write the fix** — Target the confirmed root cause, not the symptom
2. **Add a regression test** — Write a test that would have caught this bug:
   ```
   it('should <expected behavior> when <condition that caused the bug>')
   ```
3. **Remove debug artifacts** — Remove any temporary logging added in Phase 3
4. **Run the reproduction** — Confirm the original symptom is gone
5. **Run the full test suite** — Ensure no regressions:
   ```bash
   <test command from workflow.json>
   ```
6. **Run all verification commands** — Typecheck, lint, etc.
7. **Document the root cause:**
   ```
   **Root cause:** <what was wrong>
   **Fix:** <what was changed>
   **Regression test:** <test file and name>
   ```

---

## Anti-Patterns

Avoid these common debugging mistakes:

- **Shotgun debugging** — Making random changes and hoping one works. Always have a hypothesis.
- **Fixing symptoms** — Suppressing an error message without understanding the cause.
- **Skipping reproduction** — Trying to fix a bug you can't reliably reproduce.
- **Tunnel vision** — Getting stuck on one hypothesis. If it's disproved, move on.
- **Leaving debug code** — Forgetting to remove `console.log`, `debugger`, or test hacks.

---

## Output

Return to the user or orchestrator:

1. **Root cause** — what was wrong
2. **Fix applied** — what was changed (file paths and description)
3. **Regression test** — test file and test name
4. **Verification** — all gate commands pass
5. **Learnings** — anything that should be added to `AGENTS.md` or `doc/TODO.md`
