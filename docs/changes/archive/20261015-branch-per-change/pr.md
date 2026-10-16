# Branch per change: each change gets its own branch, and the evidence is readable

## Why
First users ran a quick change end to end and hit four frictions: the change landed on the base
branch, the active pointer went stale after switching branches, `init` left a dirty tree, and the
red/green evidence was recorded but never shown.
Change folder: `docs/changes/20261015-branch-per-change/` (standard route, delta approved).

## Behaviour change
| Before | After |
|---|---|
| `/sdd:new` on `main` creates the change on `main` | On `base_branch` it creates and switches to `sdd/<id>`. On any other branch it stays put. If `sdd/<id>` exists or the switch fails (for example a dirty tree), it stops, says why and creates nothing. |
| A pointer to a change absent from the checkout leaves no usable active change | The active change is resolved: the pointer if its folder is in the checkout, else the single open change, else none. Archived changes are not open. Resolution never rewrites the pointer. |
| `status`, `context`, `tdd` and the approval gate read the pointer directly | All four use the resolver. No active change keeps the gate closed. |
| `/sdd:init` leaves written files uncommitted with no prompt | After writing, the skill offers a separate yes/no to commit exactly the written paths as `chore: adopt sdd`. Files the person had already staged are left out. Declining commits nothing. |
| `sdd tdd red\|green` records runs that cannot be read back | `sdd tdd log <id>` prints the runs in order (time, phase, exit, command), or "no runs recorded". |
| `/sdd:verify` on a quick change ignores the log | It reads `sdd tdd log <id>` and reports the proving test as proven (red then green), or NO-GO naming the missing run. |

## Review focus
- The resolver in `plugins/sdd/scripts/lib/` and its four callers. It decides whether the approval
  gate is open, so a wrong "active" is a wrong "allowed".
- Branch creation in `new.mjs`. The branch is created before the folder and pointer are written, so
  a failure leaves nothing behind.
- The init commit step. It lives in the skill text, not in `sdd init --apply`, and uses explicit paths
  (`git add -- <paths>`, `git commit -- <paths>`).

## Criteria
All 19 criteria (AC-1 to AC-19) are covered by a named test. The mapping is in `verification.md`.
- AC-7, AC-8, AC-11 and AC-12 are skill-level behaviour. Tests check the skill instructions and the
  git sequence in a temp repo, not a live agent run.
- Out of scope: pointer cleanup, autopilot worktree branches, `/sdd:archive`, and the hand-derived
  pointer paths in autopilot docs and evals.

## Evidence
- `node plugins/sdd/scripts/sdd.mjs validate 20261015-branch-per-change` → ok
- `node plugins/sdd/scripts/sdd.mjs validate --all` → ok
- `npm test` → 332 tests, 332 pass, 0 fail
- `node plugins/sdd/scripts/sdd.mjs scan --diff main` → no secrets found
- No formatter is configured.
- Only CI confirms the pull request run.

## To confirm
- Product:
  - [ ] After switching back to `main` the pointer names an absent change and resolves to none, with no cleanup. Is that acceptable?
- QA:
  - [ ] Run `/sdd:init` (accept and decline), `/sdd:new` on `main` and `/sdd:verify` on a quick change by hand.
- Developers:
  - [ ] `tdd log <id>` passes the id into a file path without checking it against the id pattern. Fix here or follow up?
  - [ ] `tdd red` with no active change logs under `none`. Warn instead?
  - [ ] Untracked files do not block the branch switch (only tracked changes do). Is that intended?
  - [ ] Does resolution hold for an autopilot worktree whose branch is not `sdd/<id>`?
  - [ ] Archive must merge the REQ changes into `docs/specs/` (lifecycle, init, hooks, validation).

## Beyond the task
No refactor beyond the plan. `docs/specs/config.md` (pointer row) and `README.md`
(`tdd log`) are updated as the delta's task reminder asked.
- `sdd tdd log` now rejects ids that are not change ids (found by the reviewer subagent; fixed test-first).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
