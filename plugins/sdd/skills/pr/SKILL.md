---
name: pr
description: Opens the pull request for the active change with a behaviour-first description, after a secret scan and an independent review, and marks it ready for review after a GO verification. Use when asked to open, create or describe a pull request.
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context)
---

# Pull request

## Context
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context`

## Steps
1. Secret scan: `node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" scan --diff <base_branch>`. Any finding: stop and report rule and location.
2. Standard / full: delegate to `sdd-pr-reviewer` (merge-base scope, criteria vs tests, scope
   beyond Expected paths) and address BLOCKING findings first.
3. Size: `node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" size --base <base of this PR>`. When it
   reports `over`, the body carries a `## Size` section saying why this pull request could not be
   smaller; never hide size by moving code to excluded paths.
4. Write the body following `${CLAUDE_PLUGIN_ROOT}/references/pr-description.md`:
   quick → `docs/changes/<id>/pr.md` from template `pr-quick` (≤20 lines);
   standard/full → template `pr` (≤80 lines); with slices, `pr.md` is S1 and
   `docs/changes/<id>/pr-s<k>.md` is slice k, each opening with "Slice <k> of <n>" and linking its
   neighbours. The title is the future squash commit subject: it follows `commit.format`
   (conventional: `<type>(<scope>): <behaviour>`, ≤72 characters; guard enforces it). No absolute local paths, no secrets, no @mentions,
   and no AI attribution (no AI co-author, no "Generated with" line; `sdd validate` rejects them).
5. If `pr.forge` is `github` and `gh auth status` succeeds: push the branch
   (`git push -u origin HEAD`) and run `gh pr create --draft --base <base_branch> --title … --body-file docs/changes/<id>/pr.md`.
   Slice k ≥ 2 is stacked: `gh pr create --draft --base sdd/<id>[-s<k-1>] --title … --body-file docs/changes/<id>/pr-s<k>.md`.
   Add each URL to `prs` in `state.yaml`. Otherwise leave the bodies ready to paste and say so.
6. If `pr.auto_ready` is true (the default) and the verification is GO (quick: the proving test
   ran red then green), run `gh pr ready <url>` so the PR ends ready for review. Otherwise leave it
   as a draft and say why.

**Restack.** When a lower slice has been merged (its pull request shows merged), for the next
slice: `git checkout sdd/<id>-s<k>`, `git fetch origin`, `git merge origin/<base_branch>`
(resolve, test, commit), `git push`, then `gh pr edit <url> --base <base_branch>` if the forge
did not retarget it. Repeat up the stack.

If git or the scan cannot run (missing tool, sandbox, no remote), still write the body from the
change folder and say exactly which checks did not run — never skip the body.

## Stop
With slices left, go back to `/sdd:implement` for the next slice without asking. Otherwise report
every PR URL, its state (ready or draft), its size and what only CI confirms. Never request reviewers,
approve or merge — those are the person's.
