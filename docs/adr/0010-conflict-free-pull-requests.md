# ADR-0010: Pull requests reach the person without conflicts

Status: accepted · Cites: K3, K4, K8

## Context
After slice 1 of a change was squash-merged, slice 2 conflicted in every file both slices had
touched: the slice branch still carried slice 1's original commits and the base branch only their
squash, so git saw two unrelated edits of the same lines. The restack step of ADR-0009 merged the
base branch straight into the slice and hit exactly that. Separately, pull requests were marked
ready without checking that they still merged, and every change edited `CHANGELOG.md`, so any two
open pull requests conflicted there.

## Decision
- `sdd restack --squash <sha> --slice-head <sha>` integrates a slice after the slice below was
  squash-merged: merge the squash's parent, record the squash with `git merge -s ours` (its content
  is already in the branch through the slice head, which must be an ancestor of HEAD), then merge
  the base. Merges only: no rewritten history, no force push. Only work unrelated to the stack can
  conflict, and the command stops there for a real resolution.
- `sdd conflicts` simulates merging the base with `git merge-tree --write-tree`. `/sdd:pr` runs it
  before `gh pr ready`; on conflicts the agent merges the base, resolves, re-tests and pushes first.
- Release notes live in `docs/changes/<id>/changelog.md`; `sdd archive` folds them into
  `## [Unreleased]` of `paths.changelog`. Pull requests never edit the project changelog.

## Consequences
- A person merging the stack bottom-up never meets a conflict caused by the stack.
- Conflicts with other people's work are resolved by the agent before the pull request is ready,
  but can still appear if the base moves after that; `/sdd:pr` re-runs the check.
- `sdd conflicts` needs git ≥ 2.38 and reports "cannot simulate" (exit 3) on older git (K8).

## Rejected alternatives
- Rebasing the slice onto the base with `--onto`: rewrites published history and needs a force
  push (R1, guard).
- Resolving restack conflicts with `-X ours`: silently drops other people's changes on the base.
- Merge commits instead of squash: avoids the duplicate-commit problem but brings back
  "Merge pull request" history (ADR-0009).
