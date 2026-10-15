---
name: init
description: Bootstraps spec-driven development in the current repository - checks prerequisites, detects the stack and its test, lint, format and build commands, and proposes .sdd/config.yaml, a project constitution and AGENTS.md for confirmation.
disable-model-invocation: true
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" doctor), Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" init)
---

# Initialise sdd in this repository

## Prerequisites
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" doctor`

If any line above starts with FAIL, explain what to install (with the required version) and stop.
Write nothing.

## Proposal
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" init`

## Steps
1. Review the proposed config above. For every unresolved command, look for it in the repository
   (scripts, Makefile, README, CI files). Never guess; leave it empty if you cannot find it.
2. Draft `.sdd/constitution.md` (template `${CLAUDE_PLUGIN_ROOT}/templates/constitution.md`):
   3–10 invariants **observed in this repository** (layering, tenancy or authorisation boundaries,
   public contracts, release model, data ownership). Each row: ID · invariant · violated when ·
   evidence (a repository file). No generic values such as "quality" or "simplicity". ≤40 lines.
3. Show the person, in one message: the config (with your edits), the constitution draft, the
   files that will be written, and these yes/no options:
   - seed rule groups (list them) · CI validation workflow · team activation in
     `.claude/settings.json` (ask for the marketplace repository `owner/repo`) ·
     a `permissions.allow` list for the detected commands (needed only for unattended autopilot).
4. **Wait for confirmation.** If the person declines, write nothing.
5. On confirmation run
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" init --apply [--seed <groups>] [--ci] [--team <owner/repo>]`,
   then write your edited `.sdd/config.yaml` values and `.sdd/constitution.md`. If the person wanted
   the permissions list, add `Bash(<command>)` entries for each detected command plus
   `Bash(git add:*)`, `Bash(git commit:*)` and `Bash(gh pr create:*)` to `.claude/settings.json`.
6. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" validate --all` and fix any error.

## Stop
Summarise what was written and suggest the first change: `/sdd:new "<description>"`.
