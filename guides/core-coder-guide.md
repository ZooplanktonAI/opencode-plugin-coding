# Core Coder Guide

## Platform Detection

Before proceeding, determine which platform variant to use:

1. Read `.opencode/workflow.json` → `project.platform`
2. **Auto-detection** (if `platform` is absent or empty):
   - If `project.repo` is non-empty and contains `github.com` → use `github`
   - Otherwise → use `local`
   - **Note:** A bare `Org/repo` slug alone is not sufficient to auto-detect GitHub — GitLab and Bitbucket also use this pattern. GitHub Enterprise instances with custom domains should set `platform: "github"` explicitly.
3. **Explicit override:** if `platform` is set to `"github"` or `"local"`, use that value directly

## Load the Correct Variant

- **GitHub mode:** Load and follow `guides/core-coder-guide-github.md`
- **Local mode:** Load and follow `guides/core-coder-guide-local.md`

Do not proceed until you have loaded the correct variant file.
