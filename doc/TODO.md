# TODO

Tracked improvements deferred from review rounds.

- TODO-001: GHE hostname matching uses `repo.includes(host)` substring check — `detectPlatform()` in `.opencode/plugins/opencode-plugin-coding.js` matches GitHub Enterprise hosts via substring inclusion, which could false-positive if a GHE hostname appears as a path segment in a non-GitHub URL (e.g., `https://gitlab.example.com/github.mycompany.com/repo`). Consider using `new URL(repo).hostname === host` for precise matching, with a try/catch fallback for non-URL repo strings like bare `Org/repo` slugs. (ADV — flagged by core-secondary, core-primary, glm, gpt-5.4 in PR #11)
