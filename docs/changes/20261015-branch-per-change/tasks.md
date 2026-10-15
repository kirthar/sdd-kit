# Tasks: branch per change
<!-- Order = dependency order; every prefix must be releasable. One package per task.
     Headings are immutable once referenced: append new tasks, never renumber. -->

## T1: Resolve the active change from the checkout
- Covers: AC-4, AC-6, AC-14, AC-15, AC-16, AC-17
- Expected paths: plugins/sdd/scripts/lib/changes.mjs, plugins/sdd/scripts/lib/git.mjs, plugins/sdd/scripts/test/core.test.mjs
- Outermost test: resolver returns the pointer change, the single open change, or none, and leaves the pointer file untouched, at unit level in a temp repo
- Depends on: none
- Package: .
- Status: done

## T2: Use the resolver in status and context and tdd and the approval gate
- Covers: AC-5, AC-18
- Expected paths: plugins/sdd/scripts/lib/status.mjs, plugins/sdd/scripts/lib/context.mjs, plugins/sdd/scripts/lib/tdd.mjs, plugins/sdd/hooks/gate.mjs, plugins/sdd/scripts/test/commands.test.mjs, plugins/sdd/hooks/test/gate.test.mjs, docs/specs/config.md
- Outermost test: a stale pointer with one open change makes `sdd status` report that change active and `sdd tdd red` log under it, and with two open changes status reports none and the gate blocks a source edit, at CLI and hook level
- Depends on: T1
- Package: .
- Status: done

## T3: Print recorded runs with sdd tdd log
- Covers: AC-9, AC-10
- Expected paths: plugins/sdd/scripts/lib/tdd.mjs, plugins/sdd/scripts/sdd.mjs, plugins/sdd/scripts/test/commands.test.mjs, README.md
- Outermost test: `sdd tdd log <id>` prints red then green with exit codes, and "no runs recorded" with exit 0 for an empty or unknown id, at CLI level
- Depends on: none
- Package: .
- Status: todo

## T4: Create and switch to sdd branch when starting from the base branch
- Covers: AC-1, AC-2, AC-3, AC-13
- Expected paths: plugins/sdd/scripts/lib/new.mjs, plugins/sdd/scripts/sdd.mjs, plugins/sdd/scripts/test/commands.test.mjs, plugins/sdd/skills/new/SKILL.md
- Outermost test: `sdd new` on main lands on `sdd/<id>` with folder and pointer, stays on a feature branch, and stops with nothing created when the branch exists or the switch fails on a dirty tree, at CLI level in a temp repo
- Depends on: none
- Package: .
- Status: todo

## T5: Verify reads the tdd log for quick changes
- Covers: AC-11, AC-12
- Expected paths: plugins/sdd/skills/verify/SKILL.md, plugins/sdd/scripts/test/commands.test.mjs
- Outermost test: a log with red then green is reported proven and a log without red is NO-GO naming the missing red run, at skill-instruction level: `sdd tdd log` output for both cases plus a check that SKILL.md instructs the proven and NO-GO reports; the wording itself is confirmed by a manual run
- Depends on: T3
- Package: .
- Status: todo

## T6: Offer to commit exactly the files init wrote
- Covers: AC-7, AC-8, AC-19
- Expected paths: plugins/sdd/skills/init/SKILL.md, plugins/sdd/scripts/test/init.test.mjs
- Outermost test: the documented commit sequence (explicit `git add -- <paths>` and `git commit -- <paths>`) in a temp repo yields one `chore: adopt sdd` commit with exactly the written paths, a clean tree, and none of the previously staged files; declining leaves files uncommitted with no commit, at skill-instruction level; the accept/decline flow is confirmed by a manual run
- Depends on: none
- Package: .
- Status: todo
