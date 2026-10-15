---
name: autopilot
description: Runs one bounded, unattended pass over approved tasks in isolated worktrees and opens draft pull requests.
disable-model-invocation: true
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" autopilot:*), Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context)
---

# Autopilot pass

## Preflight
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" autopilot preflight`

- `mode: disabled` → relay the message and stop.
- `mode: report-only` → do not implement anything; write the report (step 6) listing the reasons.

## Pass (mode: live)
`SDD` below means `node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs"`.

1. `SDD autopilot lock`. If it prints `skipped: locked`, stop immediately.
2. `SDD autopilot eligible`. Lane **A** tasks may be implemented; lane **B** tasks get a plan only:
   write `docs/changes/<id>/plans/T<n>.md` (template `plan`) and list it under "plans awaiting
   approval" — the person approves with `/sdd:approve <id> plan:T<n>`. A lane B task whose plan is
   already approved in `state.yaml` is treated as lane A.
3. For each lane A task, within the budgets in `.sdd/config.yaml` (`autopilot.budgets`), and running
   `SDD autopilot heartbeat` between steps:
   a. Record `git status --porcelain` of the main checkout.
   b. `git worktree add <worktree_root>/<repo>-<id>-T<n> -b sdd/<id>-t<n> origin/<base_branch>`, then
      write the change id into that worktree's active pointer:
      `git -C <worktree> rev-parse --git-dir` → `<that dir>/sdd/active`.
   c. Delegate to `sdd-implementer` (or `sdd-coordinator` when Package lists several packages) with
      the worktree path, change id, task and the configured commands.
   d. Compare the main checkout's status with step a. If it changed: push nothing, revert nothing,
      record the escape in the report and stop the pass.
   e. In the worktree: format → commit → tests → clean tree. Re-run `SDD autopilot eligible` logic on
      the actual diff: if the changed files would fire a tripwire, stop before pushing.
   f. `SDD scan --diff origin/<base_branch>`; any finding → stop this task.
   g. `git -C <worktree> push -u origin HEAD`, then `gh pr create --draft --base <base_branch>` with a
      body from the `pr` template. Record the URL in `state.yaml` `prs`.
   h. Poll CI at most `ci_polls` times; on a real failure make at most `repairs` repair attempts.
4. Never merge, approve, request reviewers, mark ready (unless `pr.auto_ready`), comment on
   trackers, or edit `.sdd/` files or approvals. The guard and gate hooks enforce this.
5. Stop when a budget is reached; list everything not done as deferred.
6. Always: write a JSON summary `{ outcomes, plans, blocked, deferred, budget, aborted }` to a temp
   file, run `SDD autopilot report --from <file>`, then `SDD autopilot unlock`.
