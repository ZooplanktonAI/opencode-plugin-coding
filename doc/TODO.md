# TODO

Tracked improvements deferred from review rounds.

---

## TODO-004: Add CI concurrency controls to avoid redundant workflow runs

**Source:** reviewer-glm (glm-5) + reviewer-deepseek (deepseek-v3.2) advisory, PR #7 Round 1  
**Area:** tests / CI

The CI workflow triggers on push to all branches (`["**"]`) combined with PR events, which causes redundant runs (one for the push, one for the PR). Consider either:
- Restricting `push` triggers to `master` only (keeping full `pull_request` coverage), or
- Adding `concurrency` controls to cancel redundant in-progress runs for the same branch

**File:** `.github/workflows/ci.yml`
