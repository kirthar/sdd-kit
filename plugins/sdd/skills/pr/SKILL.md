---
name: pr
description: Prepares a draft pull request for the active change with a behaviour-first description, after a secret scan and an independent review. Use when asked to open, create or describe a pull request.
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context)
---

# Pull request

## Context
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context`

## Steps
1. Secret scan: `node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" scan --diff <base_branch>`. Any finding: stop and report rule and location.
2. Standard / full: delegate to `sdd-pr-reviewer` (merge-base scope, criteria vs tests, scope
   beyond Expected paths) and address BLOCKING findings first.
3. Write the body following `${CLAUDE_PLUGIN_ROOT}/references/pr-description.md`:
   quick → `docs/changes/<id>/pr.md` from template `pr-quick` (≤20 lines);
   standard/full → template `pr` (≤80 lines). No absolute local paths, no secrets, no @mentions.
4. If `pr.forge` is `github` and `gh auth status` succeeds: push the branch
   (`git push -u origin HEAD`) and run `gh pr create --draft --base <base_branch> --title … --body-file docs/changes/<id>/pr.md`.
   Add the URL to `prs` in `state.yaml`. Otherwise leave `pr.md` ready to paste and say so.

If git or the scan cannot run (missing tool, sandbox, no remote), still write the body from the
change folder and say exactly which checks did not run — never skip the body.

## Stop
Never mark ready, request reviewers, approve or merge — those are the person's.
