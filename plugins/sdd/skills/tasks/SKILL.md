---
name: tasks
description: Breaks an approved spec into small, ordered, releasable tasks with covered criteria, expected paths and the outermost test for each. Use when a spec is approved and the work needs planning into tasks.
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context)
---

# Tasks

## Context
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context`

Requires the spec artifact (`delta.md`, or `technical.md` on full) to exist and validate,
approved or not; if missing, run `/sdd:spec` first.

## Steps
1. Read the approved spec (delta or technical + functional) and contracts.
2. Write `docs/changes/<id>/tasks.md` (template `tasks`, ≤12 tasks). Each task:
   ```
   ## T<n>: <imperative title without punctuation>
   - Covers: AC-1, AC-2
   - Expected paths: <globs this task may touch>
   - Outermost test: <behaviour> at <layer> level
   - Depends on: T<k> | none
   - Package: <path from .sdd/config.yaml>
   - Status: todo
   ```
3. Order by dependency: providers before consumers; one package per task; every prefix of the
   list must be releasable on its own. A breaking contract becomes expand → migrate → contract.
4. Every criterion is covered by at least one task; every task covers at least one criterion.
5. Delegate to `sdd-spec-reviewer` for a quick check; fix BLOCKING findings.
6. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" validate <id>` until clean.

## Stop
Do not write code. Summarise the plan (spec, criteria, tasks and the questions already answered)
and ask the person once to review it and run `/sdd:approve <id> plan` — the single approval of
every planning artifact. Headings are immutable once approved: later additions are appended as
new tasks, never renumbered.
