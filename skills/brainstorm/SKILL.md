---
name: brainstorm
description: Socratic design interview that refines rough ideas into a validated design document before implementation begins.
---

# Brainstorm

A Socratic design interview that takes a rough idea and refines it into a clear, validated design document. Use this skill before `plan` to ensure the approach is sound before committing to implementation.

Inspired by Prometheus planning from Oh-My-OpenAgent and the brainstorming skill from Superpowers.

---

## When to Activate

- User has a vague feature idea or request
- User says "brainstorm", "design", "think through", "explore options"
- Before a complex task where the approach is not obvious
- The orchestrator defers to brainstorm before planning

---

## Process

### Phase 1: Understand the Problem

Ask clarifying questions to understand:

1. **What** — What is the user trying to achieve? What problem does this solve?
2. **Why** — Why is this needed now? What's the motivation?
3. **Who** — Who is the target user? What's their workflow?
4. **Constraints** — What are hard constraints (timeline, compatibility, tech stack)?

**Rules:**
- Ask **at most 3 questions per round** — do not overwhelm
- If the user's intent is already clear, skip to Phase 2
- Acknowledge what you understand before asking follow-ups

### Phase 2: Explore the Design Space

Investigate the codebase to understand the current state:

```bash
# Read project context
cat AGENTS.md
# Read relevant source files
# Search for related existing code
```

Then present **2–3 concrete approaches**, each with:

- **Approach name** — brief label
- **How it works** — 2-3 sentences
- **Pros** — key advantages
- **Cons** — key disadvantages
- **Effort estimate** — small / medium / large

Ask the user which direction they prefer, or if they want to explore a different option.

### Phase 3: Deep Dive

Once a direction is chosen:

1. **Architecture** — How does this fit into the existing codebase? What modules are affected?
2. **Data model** — What data structures or schemas change?
3. **API surface** — What interfaces change? New endpoints, new props, new methods?
4. **Edge cases** — What could go wrong? What are the boundary conditions?
5. **Testing strategy** — How will this be verified?

Present the deep dive and ask for confirmation or adjustments.

### Phase 4: Write Design Document

Produce a design document and **write it to disk** at `.opencode/designs/<feature-name>.md`:

```markdown
---
status: draft
created: <date>
author: brainstorm
---

# Design: <Feature Name>

## Problem Statement
<1-2 sentences>

## Chosen Approach
<name and brief description>

## Architecture
<how it fits into the codebase>

## Data Model Changes
<schema changes, new types, etc.>

## API Surface Changes
<new/modified interfaces>

## Edge Cases and Risks
<list>

## Testing Strategy
<how to verify>

## Estimated Scope
<small / medium / large>

## Open Questions
<anything still unresolved>
```

### Phase 5: Validate

Before finalizing, self-review the design:

- [ ] Does the design address the original problem?
- [ ] Are there any placeholder or vague sections?
- [ ] Is the scope realistic?
- [ ] Are edge cases covered?
- [ ] Is the testing strategy concrete?

If issues are found, revise and present the updated version.

---

## Output

Return to the user (or orchestrator):

1. **Design document path** — `.opencode/designs/<feature-name>.md`
2. **Recommended next step** — typically "Run the `plan` skill to decompose this into implementation tasks"
3. **Open questions** — anything that needs user input before planning

---

## Interaction Style

- Be a thoughtful collaborator, not a yes-machine
- Challenge assumptions when they seem risky
- Suggest simpler alternatives when the user is over-engineering
- Keep each response focused — don't dump everything at once
- Use concrete code examples when discussing architecture
