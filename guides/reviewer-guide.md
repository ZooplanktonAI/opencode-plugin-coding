# Normal Reviewer Guide

## Platform Detection

Before proceeding, determine which platform variant to use:

1. Read `.opencode/workflow.json` → `project.platform`
2. **Auto-detection** (if `platform` is absent or empty):
   - If `project.repo` is non-empty and looks like a GitHub slug (`Org/repo` or contains `github.com`) → use `github`
   - Otherwise → use `local`
3. **Explicit override:** if `platform` is set to `"github"` or `"local"`, use that value directly

## Load the Correct Variant

- **GitHub mode:** Load and follow `guides/reviewer-guide-github.md`
- **Local mode:** Load and follow `guides/reviewer-guide-local.md`

Do not proceed until you have loaded the correct variant file.
