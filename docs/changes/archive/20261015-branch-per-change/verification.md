# Verification: branch per change

## Commands run
- `node plugins/sdd/scripts/sdd.mjs validate 20261015-branch-per-change` → `validate: ok`
- `node plugins/sdd/scripts/sdd.mjs validate --all` (configured lint) → `validate: ok`
- Format: none configured (`format: ""`).
- `npm test` → 332 tests, 332 pass, 0 fail, 0 skipped.
- `git status --short` before writing this file → clean.

## Criterion evidence
| Criterion | Evidence (test, run, observation) | Result |
|---|---|---|
| AC-1 | commands.test.mjs: `sdd new on the base branch lands on sdd/<id> with folder and pointer` | pass |
| AC-2 | commands.test.mjs: `sdd new stays on a feature branch` | pass |
| AC-3 | commands.test.mjs: `stops with nothing created when sdd/<id> exists` | pass |
| AC-4 | core.test.mjs: stale pointer, one open change; commands.test.mjs: status reports `b` active | pass |
| AC-5 | commands.test.mjs: two open changes, `active` is null; gate.test.mjs: `stale pointer with two open changes blocks source edits` | pass |
| AC-6 | core.test.mjs: `pointer naming a change present in the checkout wins over other open changes` | pass |
| AC-7 | init.test.mjs: skill documents `git add -- <paths>` and `git commit -m "chore: adopt sdd" -- <paths>`; the sequence in a temp repo gives one `chore: adopt sdd` commit with exactly the written paths | pass |
| AC-8 | init.test.mjs: skill states declining leaves files uncommitted; after `initApply` there is no new commit and every written file is untracked | pass |
| AC-9 | commands.test.mjs: `tdd log prints recorded runs in order with exit codes` | pass |
| AC-10 | commands.test.mjs: `tdd log says no runs recorded for an empty or unknown id` | pass |
| AC-11 | commands.test.mjs: log shows red before green; verify SKILL.md instructs `tdd log <id>` and the proven report | pass (instruction level) |
| AC-12 | commands.test.mjs: log without red; verify SKILL.md instructs NO-GO naming the missing red run | pass (instruction level) |
| AC-13 | commands.test.mjs: `stops with nothing created when the switch fails on a dirty tree` | pass |
| AC-14 | core.test.mjs: `archived change is not open` | pass |
| AC-15 | core.test.mjs: `no pointer and no open change resolves to none` | pass |
| AC-16 | core.test.mjs: `detached HEAD resolves like any other checkout` | pass |
| AC-17 | core.test.mjs: the resolver leaves the pointer file naming A | pass |
| AC-18 | commands.test.mjs: `tdd logs under the single open change when the pointer is stale` | pass |
| AC-19 | init.test.mjs: `staged.txt` staged beforehand is absent from the commit and stays staged (`A  staged.txt`) | pass |

Task reminder from the delta: `docs/specs/config.md` (pointer row) and `README.md` (`tdd log`) are updated on this branch.

## Not verified locally
- The `/sdd:init` accept/decline flow, the `/sdd:verify` report wording for quick changes and the `/sdd:new` skill text are covered at instruction level only. A manual run of each skill confirms the real flow.
- CI results on the pull request.

## Verdict
GO. Every criterion has a passing test, validators pass and tests are green. The skill-level criteria (AC-7, AC-8, AC-11, AC-12) are proven by instruction and sequence checks, not by a live agent run.
