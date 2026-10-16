# Delta: semantic squash merges and small stacked pull requests

## Why
Merged work lands on the base branch as "Merge pull request #3 from owner/branch", which says
nothing about the behaviour that changed. And a large change reaches review as one large pull
request, which reviewers skim instead of read. The kit should make every merge commit the pull
request's semantic title and description, and split large changes into small stacked pull requests
under a size budget, without adding prompts to the autonomous run.

## Reuse
- `plugins/sdd/scripts/lib/config.mjs` `DEFAULTS` / `ENUMS` and V-CONFIG validate the new keys.
- `plugins/sdd/hooks/guard.mjs` `checkGh` already inspects `gh pr create|edit` arguments.
- `plugins/sdd/scripts/lib/scan.mjs` already diffs `<base>...HEAD`; `glob.mjs` `matchesAny`
  matches the exclusion globs.
- `plugins/sdd/scripts/lib/markdown.mjs` `tasks()` parses task fields; `checkTasks` in
  `validate.mjs` hosts V-TASK-FIELDS and gains the slice checks.
- `state.yaml` `prs` already holds a list, so one URL per slice needs no new key.

## ADDED
### REQ-CFG-6: Merge method and size budget
`pr.merge` (`squash` | `merge` | `rebase`, default `squash`) is how pull requests are integrated.
`pr.max_lines` (integer ≥ 1, default 400) is the review budget of one pull request.
`pr.size_exclude` (list of globs) names files that do not count; default: `docs/**`, `**/test/**`,
`**/tests/**`, `**/__tests__/**`, `**/*.test.*`, `**/*.spec.*`, `**/*_test.*`, lockfiles
(`**/package-lock.json`, `**/pnpm-lock.yaml`, `**/yarn.lock`, `**/*.lock`) and `**/vendor/**`.
Wrong types or values are V-CONFIG errors naming the key.

### REQ-HOOK-7: Pull request titles follow the commit format
With `commit.format: conventional`, guard blocks `gh pr create` and `gh pr edit --title` whose title
is not `<type>[(<scope>)][!]: <subject>` (types `feat`, `fix`, `docs`, `refactor`, `perf`, `test`,
`build`, `ci`, `chore`, `revert`, `style`), or is longer than 72 characters. With `ticket-prefix`
the title must start with `<KEY>-<n> `. With `free` any title passes. The title becomes the
squash commit subject on the base branch.

### REQ-INIT-8: Forge merge settings
`sdd forge-settings` prints, for the configured `pr.merge`, the repository settings that make the
merge commit semantic and the single `gh api -X PATCH repos/{owner}/{repo}` command that applies
them: only the configured method allowed; its commit title from the pull request title and its
message from the pull request body; `delete_branch_on_merge` on, so stacked pull requests retarget
to the base branch when the one below merges. `/sdd:init` shows them in its single confirmation
and, once confirmed and `gh` is authenticated, runs the command; otherwise it hands the command to
the person. With `pr.forge: none` it prints nothing to apply.

### REQ-VAL-7: Pull request size
`sdd size [--base <ref>]` counts added plus deleted lines in `<ref>...HEAD` (default
`base_branch`), skipping binary files and `pr.size_exclude`, and prints counted lines, excluded
lines, the budget and `within` or `over`. It always exits 0; `--json` prints the same fields.

### REQ-LIFE-15: Slices
A task may carry `- Slice: S<n>`. V-SLICE (error): either no task has a slice or every task has
one; slices start at S1 and are contiguous; the tasks of a slice are contiguous in `tasks.md`; a
task depends only on tasks of its own or an earlier slice. `/sdd:tasks` groups tasks into slices
when their predicted diff exceeds `pr.max_lines`; each slice is releasable on its own.

### REQ-LIFE-16: One stacked pull request per slice
Slice S1 is built on `sdd/<id>` with base `base_branch`; slice S<k> on `sdd/<id>-s<k>`, branched
from the slice below, with that branch as its pull request base. After the plan approval the agent
implements, verifies and opens the pull request of each slice in order, marking each ready after a
GO verification, without asking. Each body states "Slice k of n" and links its neighbours. When
`sdd size` reports `over`, the body explains in `## Size` why the slice could not be smaller.
When a lower slice is merged, `/sdd:pr` merges `base_branch` into the next slice branch and sets
its base to `base_branch` before pushing.

## MODIFIED

## REMOVED

## Acceptance criteria
- AC-1 Given a config with only `version: 1`, When `sdd config --effective` runs, Then `pr.merge` is `squash`, `pr.max_lines` is 400 and `pr.size_exclude` contains `docs/**`.
- AC-2 Given `pr.merge: fast` or `pr.max_lines: 0`, When `sdd validate` runs, Then it exits 1 with `V-CONFIG` naming the key.
- AC-3 Given `commit.format: conventional`, When guard evaluates `gh pr create --draft --base main --title "Update stuff"`, Then it blocks naming the expected format.
- AC-4 Given `commit.format: conventional`, When guard evaluates `gh pr create --draft --base main --title "feat(pr): stack slices"`, Then it allows.
- AC-5 Given `commit.format: free`, When guard evaluates a PR with any title, Then it allows.
- AC-6 Given `pr.merge: squash`, When `sdd forge-settings --json` runs, Then it lists `allow_squash_merge: true`, `allow_merge_commit: false`, `allow_rebase_merge: false`, `squash_merge_commit_title: PR_TITLE`, `squash_merge_commit_message: PR_BODY`, `delete_branch_on_merge: true` and one `gh api -X PATCH` command.
- AC-7 Given `pr.merge: merge`, When `sdd forge-settings --json` runs, Then it lists `merge_commit_title: PR_TITLE` and `merge_commit_message: PR_BODY`.
- AC-8 Given `pr.forge: none`, When `sdd forge-settings` runs, Then it exits 0 and prints no command.
- AC-9 Given this repository, When its settings are read with `gh api repos/{owner}/{repo}`, Then they match `sdd forge-settings`.
- AC-10 Given a branch adding 500 lines in `src/` and 300 in `test/`, When `sdd size --base main` runs, Then it reports 500 counted, 300 excluded, budget 400 and `over`.
- AC-11 Given tasks where only some carry a slice, or S1 then S3, When `sdd validate` runs, Then it exits 1 with V-SLICE.
- AC-12 Given a task in S1 that depends on a task in S2, When `sdd validate` runs, Then it exits 1 with V-SLICE naming both tasks.
- AC-13 Given tasks without any slice, When `sdd validate` runs, Then no V-SLICE finding is reported.
- AC-14 Given the tasks, implement and pr skills, When their text is read, Then tasks groups into slices by `pr.max_lines`, implement and pr work slice by slice on `sdd/<id>-s<k>` with the slice below as base, and pr restacks after a lower slice merges.
- AC-15 Given the pr skill and the `pr` template, When their text is read, Then the title follows `commit.format`, the body states the slice and a `## Size` section is required when `sdd size` reports `over`.

## Open questions
