# Delta: conflict-free pull requests

## Why
Squash-merging slice 1 left slice 2 conflicting: the slice branch still carried slice 1's original
commits while the base branch only had their squash, so every file both slices touched conflicted
although nothing really clashed. Pull requests also reach "ready" without checking that they still
merge, and parallel changes collide on `CHANGELOG.md`. A person should never meet a conflict the
kit could have prevented.

## Reuse
- The fix applied by hand to pull request #13 (merge the squash's parent, record the squash with
  `-s ours`, merge the base) is the algorithm; `plugins/sdd/scripts/lib/git.mjs` runs git.
- `git merge-tree --write-tree` (git ≥ 2.38) simulates a merge without touching the tree;
  `plugins/sdd/scripts/lib/doctor.mjs` already reports the git version.
- `plugins/sdd/scripts/lib/archive.mjs` already rewrites living specs on archive; the changelog
  fold sits beside it. `docs/changes/<id>/` already holds per-change artifacts.

## ADDED
### REQ-LIFE-17: Restack without conflicts
`sdd restack --squash <sha> --slice-head <sha> [--base <ref>]` integrates the current slice branch
after the slice below was squash-merged as `<squash>` from `<slice-head>`. It refuses, changing
nothing, on a dirty tree or when `<slice-head>` is not an ancestor of HEAD. Otherwise it merges
`<squash>^`, records `<squash>` with `git merge -s ours` (its content is already in the branch
through `<slice-head>`), then merges `<base>` (default `origin/<base_branch>`). No history is
rewritten and nothing is force pushed. A conflict can only come from other work on the base: the
command stops with the merge in progress, lists the files and exits 1. `/sdd:pr` restacks with it
and then sets the pull request base to `base_branch`.

### REQ-VAL-8: Conflict check
`sdd conflicts [--base <ref>]` simulates merging `<ref>` (default `origin/<base_branch>`) into HEAD
with `git merge-tree --write-tree` and lists conflicting files: exit 0 when clean, 1 on conflicts,
3 when git cannot simulate. Before marking a pull request ready, `/sdd:pr` fetches, runs it
against the pull request's base and, on conflicts, merges that base, resolves, re-runs the tests
and pushes first.

### REQ-VAL-9: Changelog entries
A change keeps its release notes in `docs/changes/<id>/changelog.md` (template `changelog`:
`### Added`, `### Changed`, `### Fixed`, bullet lines) and never edits the project changelog.
`sdd archive` appends each bullet under the same heading of `## [Unreleased]` in the file at
`paths.changelog` (default `CHANGELOG.md`), creating missing headings in that order; when that file
or its `## [Unreleased]` section does not exist it skips the fold and says so.

### REQ-CFG-7: Changelog path
`paths.changelog` (string, project-relative, default `CHANGELOG.md`). Same checks as
`paths.constitution` under V-CONFIG.

## MODIFIED

## REMOVED

## Acceptance criteria
- AC-1 Given slice 2 branched from slice 1, both editing the same file, and slice 1 squash-merged into main, When `sdd restack --squash <q> --slice-head <s1> --base main` runs on slice 2, Then it exits 0 without conflicts, the tree equals slice 2's tree before the restack, and main is an ancestor of HEAD.
- AC-2 Given main gained an unrelated commit after the squash, When restack runs, Then that commit's change is in HEAD and it exits 0.
- AC-3 Given `--slice-head` is not an ancestor of HEAD, When restack runs, Then it exits 1 and HEAD is unchanged.
- AC-4 Given a dirty working tree, When restack runs, Then it exits 1 and nothing changes.
- AC-5 Given main later changed the same lines as slice 2, When restack runs, Then it exits 1 naming the file and the merge is left in progress.
- AC-6 Given a branch whose changes conflict with the base, When `sdd conflicts --base main` runs, Then it exits 1 listing the file; Given no conflict, Then it exits 0.
- AC-7 Given `changelog.md` with entries under Added and Fixed and a `CHANGELOG.md` with `## [Unreleased]`, When `sdd archive` runs, Then each entry appears under the matching heading of `## [Unreleased]`.
- AC-8 Given no `CHANGELOG.md`, When `sdd archive` runs, Then it archives the change and reports the fold as skipped.
- AC-9 Given a config with only `version: 1`, When `sdd config --effective` runs, Then `paths.changelog` is `CHANGELOG.md`; Given `paths.changelog: ../x.md`, When `sdd validate` runs, Then it exits 1 with V-CONFIG.
- AC-10 Given the pr, implement and tasks skills and the `changelog` template, When their text is read, Then pr restacks with `sdd restack` and runs `sdd conflicts` before `gh pr ready`, and release notes go to `changelog.md` instead of the project changelog.

## Open questions
