---
name: test-driven-development
description: Enforce RED-GREEN-REFACTOR test-driven development cycle. Write failing test first, implement minimal code, then refactor. Opt-in per project.
---

# Test-Driven Development

Enforce the RED-GREEN-REFACTOR test-driven development cycle. This skill is **opt-in** — enable it in `workflow.json` → `tdd.enabled: true`.

When active, the core-coder must write failing tests before implementation code. This ensures test coverage is a first-class deliverable, not an afterthought.

Inspired by the test-driven-development skill from Superpowers.

---

## When to Activate

- `workflow.json` → `tdd.enabled` is `true`
- User explicitly requests TDD approach
- The orchestrator or core-coder decides TDD is appropriate for a task

---

## The RED-GREEN-REFACTOR Cycle

### RED: Write a Failing Test

1. Identify the behavior to implement from the plan
2. Write a test that asserts the expected behavior
3. Run the test — it **must fail** (if it passes, the test is wrong or the behavior already exists)
4. Commit the failing test: `test: add failing test for <behavior>`

### GREEN: Make It Pass

1. Write the **minimum** code to make the failing test pass
2. Do not add extra features, optimizations, or edge cases yet
3. Run the test — it **must pass**
4. Run all other tests — ensure nothing is broken
5. Commit: `feat(<scope>): implement <behavior>`

### REFACTOR: Clean Up

1. Improve code quality without changing behavior
2. Look for: duplication, naming, structure, readability
3. Run all tests after each refactoring step — they must still pass
4. Commit: `refactor(<scope>): <what was improved>`

### Repeat

Move to the next behavior from the plan and start a new RED cycle.

---

## Process

For each task in the plan:

1. **Analyze the task** — What testable behaviors does it introduce?
2. **List test cases** — Before writing any code, list the test cases:
   ```
   Test cases for Task N:
   - [ ] When <input/condition>, should <expected behavior>
   - [ ] When <edge case>, should <expected behavior>
   - [ ] When <error case>, should <expected behavior>
   ```
3. **RED-GREEN-REFACTOR** — Execute the cycle for each test case
4. **Verify** — Run the full test suite after completing all cases for a task

### Test File Conventions

- Place tests adjacent to source files or in a `__tests__/` directory, following the project's existing pattern
- Name test files consistently: `*.test.ts`, `*.spec.ts`, or match existing convention
- Use descriptive test names: `it('should return empty array when no items match filter')`

### When TDD Doesn't Fit

Some changes don't benefit from TDD:

- Pure configuration changes
- Documentation updates
- Trivial one-line fixes with obvious correctness
- UI layout changes (use visual testing instead)

For these, write tests after implementation (or skip if truly trivial).

---

## Integration with Orchestrate

When `tdd.enabled` is true, the `orchestrate` skill modifies the core-coder implementation template:

```
Implement the approved plan using TDD (RED-GREEN-REFACTOR cycle).

For each task:
1. Write failing tests first
2. Implement minimal code to pass
3. Refactor
4. Run full test suite before moving to next task

Follow the test-driven-development skill instructions.
```

Reviewers should verify TDD compliance: are there tests for new behavior? Were tests written before implementation (check commit order)?

---

## Rules

- **Tests must fail first.** If a test passes immediately, investigate — the behavior may already exist or the test may be wrong.
- **Minimum code to pass.** Do not over-engineer in the GREEN phase. Save improvements for REFACTOR.
- **All tests must pass after GREEN.** Never leave the codebase with failing tests.
- **Commit at each phase.** RED, GREEN, and REFACTOR each get their own commit for traceability.
- **Do not skip REFACTOR.** Even if the GREEN code looks clean, take a moment to evaluate.
