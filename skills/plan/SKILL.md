---
name: plan
description: Decompose a design into bite-sized implementation tasks with exact file paths, acceptance criteria, and verification steps. Writes plan to disk.
---

# Plan

Decomposes an approved design (from `brainstorm` or a direct user request) into a concrete, ordered implementation plan. The plan is written to disk before any implementation begins — this is a hard guarantee.

Inspired by the writing-plans and executing-plans skills from Superpowers.

---

## When to Activate

- After brainstorm produces a design document
- User says "plan", "break this down", "create tasks"
- The orchestrator requests a plan before implementation
- A complex task needs decomposition before coding

---

## Inputs

One of:

1. A design document at `.opencode/designs/<feature-name>.md`
2. A direct task description from the user or orchestrator
3. A PR description or issue to implement

---

## Process

### Step 1: Read Context

```bash
cat AGENTS.md
cat .opencode/workflow.json
# Read design doc if it exists
# Read any files passed by the user/orchestrator
```

Understand the project structure, conventions, and verification commands.

### Step 2: Explore the Codebase

Investigate the files that will be affected:

- Read existing source files to understand current patterns
- Identify dependencies between files
- Note any gotchas or constraints from `AGENTS.md`

### Step 3: Decompose into Tasks

Break the work into ordered, atomic tasks. Each task should be:

- **Small** — completable in one focused session
- **Testable** — has clear acceptance criteria
- **Ordered** — dependencies are explicit

For each task, specify:

```markdown
- [ ] Task N: <title>
  - **Files:** <exact file paths to create/modify>
  - **What:** <1-2 sentence description of the change>
  - **Acceptance:** <concrete criteria — what must be true when done>
  - **Dependencies:** <which prior tasks must be complete>
```

### Step 4: Define Verification

Map `workflow.json` → `commands` to the plan:

```markdown
## Verification

After all tasks are complete, run:
- Typecheck: `<typecheck command>`
- Lint: `<lint command>`
- Test: `<test command>`
- Build: `<build command>`
```

### Step 5: Self-Review

Before writing to disk, verify:

- [ ] Every file path is real (exists or will be created by a prior task)
- [ ] No placeholder text like "TBD" or "TODO" in acceptance criteria
- [ ] Tasks are ordered correctly — no task depends on a later task
- [ ] Type consistency — if Task 1 changes a type, Tasks 2+ that use it are listed
- [ ] Scope is realistic — no task tries to do too much
- [ ] Verification commands match what's in `workflow.json`

### Step 6: Write Plan to Disk

Write the plan to `.opencode/plans/<branch-name>.md`:

```markdown
---
status: not_started
branch: <branch-name>
created: <YYYY-MM-DD>
design: <path to design doc, if any>
---

# Plan: <Title>

## Context

<1-3 sentences — what this plan accomplishes and why>

## Tasks

- [ ] Task 1: <title>
  - **Files:** `src/path/to/file.ts`
  - **What:** <description>
  - **Acceptance:** <criteria>

- [ ] Task 2: <title>
  - **Files:** `src/path/to/other.ts`
  - **What:** <description>
  - **Acceptance:** <criteria>
  - **Dependencies:** Task 1

## Verification

| Command | Expected |
|---------|----------|
| `<typecheck>` | 0 errors |
| `<lint>` | clean |
| `<test>` | all pass |
| `<build>` | success |

## Risks

- <risk 1>
- <risk 2>

## Learnings (updated during execution)

- (none yet)
```

Create the directory if needed:

```bash
mkdir -p .opencode/plans
```

---

## Output

Return to the user (or orchestrator):

1. **Plan file path** — `.opencode/plans/<branch-name>.md`
2. **Task count** — number of tasks
3. **Estimated scope** — small / medium / large
4. **Risks** — key risks identified
5. **Recommendation** — "Ready to implement" or "Needs design clarification on X"

---

## Plan Lifecycle

The plan status field tracks progression:

| Status | Meaning |
|--------|---------|
| `not_started` | Plan written, not yet being implemented |
| `in_progress` | Core-coder is actively implementing |
| `completed` | All tasks done, PR merged |

The `orchestrate` skill manages status transitions.

---

## Cleanup Rules

Plan cleanup runs at orchestration start/end:

- Delete plans older than 7 days **only if** status is `completed`
- For plans older than 7 days with non-completed status, raise a **stale alert** (do not auto-delete)
