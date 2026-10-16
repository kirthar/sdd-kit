---
name: implement
description: Implements every remaining approved task of the active change, or a confirmed quick fix, with strict test-first red-green-refactor cycles, small commits and lint-first validation. Use when asked to implement, code, build or fix something that already has a confirmed change.
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context)
---

# Implement

## Context
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context`

If the gate would block (missing approvals in Context), stop and name the `/sdd:approve` command
the person must run. Never edit `state.yaml` approvals.

## Steps
1. Pick the work: quick → the brief's proving test; with `T<n>` → that task only; otherwise
   every remaining task, one after another, each time the first `Status: todo` task whose
   dependencies are done. For each task read its Covers, Expected paths and Outermost test.
   With slices, work slice by slice: S1 on `sdd/<id>`; before the first task of S<k> (k ≥ 2)
   create `sdd/<id>-s<k>` from the branch of S<k-1> (`git checkout -b sdd/<id>-s<k>`).
2. Read `${CLAUDE_PLUGIN_ROOT}/references/tdd.md` and follow it exactly. Use the commands in
   `.sdd/config.yaml` (`test_single`, `test`, `lint`, `format`). Every cycle:
   - write one failing test → `node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" tdd red -- <single test command>` (must fail for the expected reason)
   - minimum code → `node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" tdd green -- <single test command>`
   - refactor → commit (stage explicit paths only). Commit messages never name an AI assistant
     as co-author nor carry a "Generated with" line; the author's own signature is fine.
3. Stay inside the task's Expected paths. If you need to leave them, or you touch contracts,
   schemas, security or more packages than planned, stop and explain.
4. When the behaviour is complete: format, lint (commit rewrites), full test command, clean tree.
5. Mark the task `- Status: done` in `tasks.md` (not for quick), then go on with the next task
   without asking.

## Next
When the tasks of the current slice are done (or every task, without slices), continue in the
same turn with `/sdd:verify` and `/sdd:pr` for that slice, then come back for the next slice. Stop early only for the
reasons in step 3 or a failing test you cannot fix within the task, and then report the commands
run with their results, the reason and the exact next command.
