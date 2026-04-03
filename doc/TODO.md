# TODO

Tracked improvements deferred from review rounds.

- TODO-001: Integrate `testDrivenDevelopment.enabled` into orchestrate flow — `skills/test-driven-development/SKILL.md` says orchestrate should modify the core-coder implementation template when TDD is enabled, but `skills/orchestrate/SKILL.md` never reads this config field. Needs design decision on how TDD modifies the orchestrate phases. (A-3)
- TODO-002: Update MiniMax key in `.opencode/reviewer-knowledge.json` — the gitignored knowledge file may contain the old model ID `alibaba-coding-plan-cn/MiniMax-M2.5` as a key. When the file exists, update the key to `minimax-cn-coding-plan/MiniMax-M2.7` to match `workflow.json`. File is ephemeral and not present on clean clones. (A-12)
