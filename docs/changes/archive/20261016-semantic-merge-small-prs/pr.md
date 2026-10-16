## Why
Merges landed on `main` as "Merge pull request #11 from owner/branch", which says nothing about
the behaviour that changed. This is slice 1 of 2 of
`docs/changes/20261016-semantic-merge-small-prs/`: every merge becomes one squash commit whose
subject is the pull request's conventional title and whose message is its description.

## Behaviour change
- **Before:** any PR title; merge commits named after the branch; repository settings untouched.
- **After:**
  - `pr.merge` (default `squash`), `pr.max_lines` (default 400) and `pr.size_exclude` exist in the
    config and are validated (V-CONFIG).
  - `guard` blocks `gh pr create` / `gh pr edit --title` whose title does not follow
    `commit.format` (conventional: `type(scope): subject`, ≤72 chars; ticket-prefix: `KEY-1 …`).
  - `sdd forge-settings` prints the repository settings and the one `gh api -X PATCH` command:
    only the configured method, commit title from the PR title, message from the PR body, branch
    deleted on merge (so stacked PRs retarget). `/sdd:init` offers it in its confirmation.
  - This repository now uses those settings (applied and read back).

## Review focus
- `plugins/sdd/hooks/guard.mjs` `checkTitle`: the conventional regex and the 72-char limit; a
  default config is `conventional`, so every adopter's PR titles are now checked.
- `plugins/sdd/scripts/lib/forge.mjs`: settings per method; `{owner}/{repo}` is resolved by `gh`.

## Criteria
Covered: AC-1 … AC-9 (see `verification.md`). Slice 2 covers AC-10 … AC-15 (size and stacked slices).

## Evidence
- `npm test` → 462 pass. `sdd validate --all` → exit 0. `sdd scan --diff main` → clean.
- Repository settings read back match `sdd forge-settings` (6 keys).
- Size: 78 counted lines (budget 400).

## To confirm
- [ ] Maintainers: the squash commit message is the full PR body (`PR_BODY`); `COMMIT_MESSAGES` or
      `BLANK` are the alternatives.
- [ ] Merge this slice first; slice 2 is stacked on it and retargets to `main` automatically.

## Beyond the task
- Guard test fixtures that used `--title t` now use `--title "fix: t"`, since titles are checked
  under the default config.
