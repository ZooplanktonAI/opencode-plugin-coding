---
description: Sync agent files with the latest plugin templates while preserving model assignments.
---

# /zooplankton-coding-update — Sync Agent Templates

When the user runs `/zooplankton-coding-update`, compare the plugin's agent templates against the project's agent files and offer to update them.

## Step 1: Identify Agent Files

Read `.opencode/workflow.json` → `agents` to get all agent names and their categories:

- `agents.coreCoder` → template: `templates/agents/core-coder.md`
- `agents.coreReviewers[]` → template: `templates/agents/core-reviewer.md`
- `agents.reviewers[]` → template: `templates/agents/reviewer.md`
- `agents.securityReviewers[]` → template: `templates/agents/security-reviewer.md`

## Step 2: Compare Versions

For each agent name, read both files:

- **Template**: the corresponding `templates/agents/<type>.md`
- **Project file**: `.opencode/agents/<name>.md`

Extract the `# plugin-version: N` line from both files. Compare:

| Template version | Project version | Action |
|------------------|-----------------|--------|
| Same | Same | Skip — up to date |
| Higher | Lower | Offer update |
| — | Missing | Project file has no version line — treat as outdated |
| — | File doesn't exist | Offer to create (same as `/zooplankton-coding-init` would) |

## Step 3: Show Diff for Each Outdated File

For each file that needs updating:

1. Read the project file's `model:` line from YAML frontmatter — this is the **user's model assignment**
2. Read the template file content
3. Replace `$MODEL` in the template with the user's existing model assignment
4. Show the diff between the current project file and the new content

Present the diff to the user like:

```
### <name>.md (version 1 → 2)

Model preserved: `<model-id>`

Changes:
- <summary of what changed in the template>

Accept this update? [y/n]
```

## Step 4: Apply Accepted Updates

For each file the user accepts:

1. Write the updated content to `.opencode/agents/<name>.md`
2. Preserve the user's `model:` line from the original file

For each file the user rejects:

1. Skip — leave unchanged
2. Note that the file is still outdated

## Step 5: Handle New Agents

If workflow.json lists agent names that have no corresponding `.opencode/agents/<name>.md` file:

1. List the missing agents
2. Ask the user for model assignments (or use defaults from `/zooplankton-coding-init`)
3. Generate the files from templates

## Step 6: Print Summary

```
## /zooplankton-coding-update Complete

**Updated:** <count> agent files
**Skipped:** <count> (user declined or already up to date)
**Created:** <count> new agent files

Files updated:
- .opencode/agents/<name>.md (v1 → v2)
- ...
```

## Rules

- **Never overwrite the model line** without user confirmation — model assignments are the primary user customization
- **Preserve any user additions** below the frontmatter (e.g., custom instructions the user appended)
- If a project file has custom content beyond the standard template body, warn the user that it will be replaced and show the diff
- The version line (`# plugin-version: N`) must be a YAML comment inside the frontmatter (between the `---` delimiters)
