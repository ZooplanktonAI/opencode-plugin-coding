---
name: orchestrate
description: Full multi-agent software development workflow — implement, review, merge, and retrospective — with parallel reviewer coordination and adaptive scoring.
---

# Skill: orchestrate

## Platform Detection

Before proceeding, determine which platform variant to use:

1. Read `.opencode/workflow.json` → `project.platform`
2. **Auto-detection** (if `platform` is absent or empty):
   - If `project.repo` is non-empty and contains `github.com` → use `github`
   - If `project.repo` matches any hostname in `project.githubEnterpriseHosts` → use `github`
   - Otherwise → use `local`
   - **Note:** A bare `Org/repo` slug alone is not sufficient to auto-detect GitHub — GitLab and Bitbucket also use this pattern.
3. **Explicit override:** if `platform` is set to `"github"` or `"local"`, use that value directly

## Load the Correct Variant

- **GitHub mode:** Load and follow `skills/orchestrate/SKILL-github.md`
- **Local mode:** Load and follow `skills/orchestrate/SKILL-local.md`

Do not proceed until you have loaded the correct variant file.
