---
name: implement
description: Implements the next approved task of the active change, or a confirmed quick fix, with strict test-first red-green-refactor cycles, small commits and lint-first validation. Use when asked to implement, code, build or fix something that already has a confirmed change.
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context)
---

# Implement

## Context
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context`

If the gate would block (missing approvals in Context), stop and name the `/sdd:approve` command
the person must run. Never edit `state.yaml` approvals.

## Steps
1. Pick the task: quick → the brief's proving test; otherwise the named `T<n>` or the first
   `Status: todo` task whose dependencies are done. Read its Covers, Expected paths and Outermost test.
2. Read `${CLAUDE_PLUGIN_ROOT}/references/tdd.md` and follow it exactly. Use the commands in
   `.sdd/config.yaml` (`test_single`, `test`, `lint`, `format`). Every cycle:
   - write one failing test → `node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" tdd red -- <single test command>` (must fail for the expected reason)
   - minimum code → `node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" tdd green -- <single test command>`
   - refactor → commit (stage explicit paths only).
3. Stay inside the task's Expected paths. If you need to leave them, or you touch contracts,
   schemas, security or more packages than planned, stop and explain.
4. When the behaviour is complete: format, lint (commit rewrites), full test command, clean tree.
5. Mark the task `- Status: done` in `tasks.md` (not for quick).

## Stop
Stop after one task. Report the commands run with their results and what only CI can confirm.
Suggest `/sdd:verify` when all tasks are done, or the next task otherwise.
