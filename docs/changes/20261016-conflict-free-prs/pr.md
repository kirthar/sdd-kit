## Why
After slice 1 was squash-merged (#12), slice 2 (#13) conflicted in every file both slices touched,
although nothing really clashed: the slice branch carried slice 1's original commits, `main` only
their squash, and the restack step merged `main` straight in. Pull requests were also marked ready
without checking that they still merge, and every change edited `CHANGELOG.md`, so any two open
pull requests conflicted there. A person should never meet a conflict the kit could prevent.
Change folder: `docs/changes/20261016-conflict-free-prs/` · ADR-0010.

## Behaviour change
- **Restack:** `sdd restack --squash <sha> --slice-head <sha>` merges the squash's parent, records
  the squash with `-s ours` (its content is already in the branch — the slice head must be an
  ancestor), then merges the base. No rewritten history, no force push; only unrelated base work
  can conflict, and it stops there. `/sdd:pr` restacks with it instead of a plain merge.
- **Before ready:** `sdd conflicts` simulates the merge with the PR base (`git merge-tree`);
  `/sdd:pr` resolves any conflict, re-tests and pushes before `gh pr ready`.
- **Changelog:** release notes live in `docs/changes/<id>/changelog.md`; `sdd archive` folds them
  under `## [Unreleased]` of `paths.changelog`. Pull requests no longer edit `CHANGELOG.md`.

## Review focus
- `plugins/sdd/scripts/lib/restack.mjs`: the `-s ours` step is only safe because the slice head is
  checked to be an ancestor of HEAD; review that guard and the three merge order.
- `plugins/sdd/scripts/lib/changelog.mjs`: heading insertion order and continuation lines.
- `plugins/sdd/skills/pr/SKILL.md`: conflict check now gates `gh pr ready`.

## Criteria
Covered: AC-1 … AC-10 (see `verification.md`).

## Evidence
- `npm test` → 493 pass. `sdd validate --all` → exit 0. Manifests pass. Scan clean.
- `sdd conflicts --base origin/main` → none. Size: 208 counted, budget 400.
- The restack algorithm was first applied by hand to #13, which went from CONFLICTING to CLEAN
  with an identical tree.

## To confirm
- [ ] Maintainers: git ≥ 2.38 for `sdd conflicts` (older git reports "cannot simulate", exit 3).

## Beyond the task
- ADR-0009 now points to ADR-0010 for restacking. This change dogfoods `changelog.md` and leaves
  `CHANGELOG.md` untouched; R12 added to `.sdd/rules.md`.
