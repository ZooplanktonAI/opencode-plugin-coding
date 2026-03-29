---
description: Check workflow.json for schema updates and show what's new in the plugin.
---

# /zooplankton-coding-update — Sync Configuration

When the user runs `/zooplankton-coding-update`, check the project's workflow.json against the current plugin schema and report any needed updates.

## Step 1: Read Current Configuration

Read `.opencode/workflow.json` from the project. If it doesn't exist, tell the user to run `/zooplankton-coding-init` first.

## Step 2: Schema Validation

Compare the project's `workflow.json` against the template at `templates/workflow.json`. Check for:

### Missing fields

If the template has fields that the project file lacks, list them:

```
New fields available:
- `<field>`: <description> (default: <value>)
```

Offer to add them with sensible defaults.

### Deprecated fields

If the project file has fields that are no longer in the template, warn:

```
Deprecated fields found:
- `<field>`: <reason>
```

### Agent format migration

If the project's `agents` section uses the old bare-string format:

```json
"coreCoder": "core-coder"
```

Offer to migrate to the new `{ name, model }` format:

```json
"coreCoder": { "name": "core-coder", "model": "" }
```

Show the proposed migration and ask for confirmation before writing.

## Step 3: Guide Changes Summary

Read the plugin's guide files (`guides/*.md`) and show a brief changelog if significant changes were made since the last update. This is informational only — guides are loaded dynamically by the plugin, so no action is needed from the user.

```
Plugin guide updates (applied automatically):
- core-coder-guide.md: <summary of changes, or "no changes">
- core-reviewer-guide.md: <summary>
- reviewer-guide.md: <summary>
- security-reviewer-guide.md: <summary>
```

## Step 4: Apply Accepted Changes

For each change the user accepts:

1. Update `.opencode/workflow.json` with the new fields/format
2. Preserve all existing user values

For each change the user rejects:

1. Skip — leave unchanged
2. Note that the configuration may be outdated

## Step 5: Print Summary

```
## /zooplankton-coding-update Complete

**Schema updates applied:** <count>
**Schema updates skipped:** <count>

**Reminder:** Agents are registered dynamically from workflow.json by the plugin.
To change models or add/remove agents, edit `.opencode/workflow.json` and restart OpenCode.
```

## Rules

- **Never overwrite user values** without confirmation — model assignments, agent names, project settings are user customizations
- **Preserve comments** if the file has any (though JSON doesn't support comments, some users use JSONC)
- If no updates are needed, say so clearly and exit
