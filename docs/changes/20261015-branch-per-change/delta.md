# Delta: branch per change

## Why
First users ran a quick change end to end and hit four frictions: the change landed on the base
branch, the active pointer went stale after switching branches, init left a dirty tree, and the
red/green evidence was recorded but never shown. Each change now lives on its own branch, the
pointer follows the branch, and the evidence is readable.

## Reuse
- `readActive` / `writeActive` in [git.mjs](../../../plugins/sdd/scripts/lib/git.mjs): the pointer; resolution wraps `readActive`.
- `listChanges` in [changes.mjs](../../../plugins/sdd/scripts/lib/changes.mjs): open changes in the checkout (skips `archive/`), so "exists on this branch" needs no git call.
- `newChange` in [new.mjs](../../../plugins/sdd/scripts/lib/new.mjs): branch step goes before `writeActive`.
- `readTddLog` in [tdd.mjs](../../../plugins/sdd/scripts/lib/tdd.mjs): already parses the log; only the `log` subcommand is new.
- `initApply` returns `written` ([init.mjs](../../../plugins/sdd/scripts/lib/init.mjs)): the path list for the commit.
- `base_branch` config (default `main`); not `release.branch`.
- Pointer callers to switch to the resolver: `tdd.mjs`, `status.mjs`, `context.mjs`, `hooks/gate.mjs`.
- Duplicates (pointer path re-derived by hand): `skills/autopilot/SKILL.md`, `evals/_shared/repo.sh`. Left as is: autopilot worktrees set an explicit pointer that resolves.

## ADDED

### REQ-LIFE-13: Active change follows the branch
The active change is resolved, never assumed from the pointer alone. If the pointer names a change
whose folder exists (not archived) in the current checkout, that is the active change. Otherwise,
if exactly one open change exists in the checkout, that is the active change. With none or several,
there is no active change. An archived change is not open. Resolution only reads and never
rewrites the pointer file, and every reader (`status`, `context`, `tdd`, the approval gate) uses it.
- A detached HEAD or an unborn branch resolves like any other checkout.
- No active change keeps the approval gate closed (REQ-HOOK-4).

## MODIFIED

### REQ-LIFE-1: Start a change
`/sdd:new <description>` (auto). Classifies with the ADR-0001 signals, prints the
route and fired signals, creates the folder and `state.yaml` without approvals, writes `brief.md`
for quick, sets the active pointer, and asks the person to confirm with `/sdd:approve <id> route`
(optionally `route=<other>` to override). When the current branch is `base_branch`, it first
creates and switches to `sdd/<id>`; on any other branch it stays there. If `sdd/<id>` already
exists or the switch fails (for example a dirty tree), it stops, reports why and creates nothing.
- AC-LIFE-1.1 Given "fix a typo in the confirmation email", When `/sdd:new` runs, Then the route is
  quick and only `state.yaml` and `brief.md` exist in the change folder.
- AC-LIFE-1.2 Given a description adding a public endpoint, When `/sdd:new` runs, Then the route is
  full and the signal `new-public-contract` is printed.
- AC-LIFE-1.3 Given a new quick change, When the model tries to edit source code before
  `/sdd:approve <id> route`, Then the gate hook blocks the edit.

### REQ-LIFE-7: Verify
`/sdd:verify` (auto). Runs `sdd validate`, the configured lint and tests, and builds
a criterion → evidence matrix in `verification.md` (standard and full). For quick, it reads
`sdd tdd log <id>` and checks that the proving test from `brief.md` ran red and then green, and
reports to the terminal only. Lists the exact commands and what only CI confirms.
- AC-LIFE-7.1 Given a criterion with no evidence, When verify runs, Then `verification.md` says
  NO-GO and names the criterion.
- AC-LIFE-7.2 Given a quick change, When verify runs, Then no file is written.

### REQ-VAL-4: Test first log
`sdd tdd red|green -- <cmd>`. Runs the command, asserts it failed (red) or passed
(green), and appends `{time, change, phase, cmd, exit}` to the tdd log under the resolved active
change (REQ-LIFE-13). `sdd tdd log <id>` prints that change's recorded runs in order, one per
line (time, phase, exit, command), and says "no runs recorded" when there are none. A red run that
passes, or a green run that fails, exits 1.
- AC-VAL-4.1 Given `sdd tdd red -- node -e "process.exit(0)"`, When it runs, Then it exits 1 with
  "expected failure, got success".

### REQ-INIT-4: Proposal then confirmation
Proposal, then confirmation. Shows the full proposal — config, constitution, empty
rules, `AGENTS.md` section, `CLAUDE.md` import line, `.gitignore` entry for `.sdd/local/` — and
writes only the confirmed plan (`sdd init --plan` / `sdd init --apply <plan.json>`). After writing,
it offers, as a separate yes/no, to commit exactly the written paths as `chore: adopt sdd`. The
commit is made by the skill, not by `sdd init --apply`; declining leaves the files uncommitted.
- AC-INIT-4.1 Given the person declines, When init ends, Then `git status` is clean.
- AC-INIT-4.2 Given an existing config, When init re-runs, Then it shows a diff and keeps values the
  person set unless they confirm changes.

### REQ-HOOK-4: Approval gate
With `gates.enforce: true` (default) in an initialised repo, a write
outside `docs/`, `.sdd/` and `gates.exempt` is allowed only when the active change (resolved per
REQ-LIFE-13) has every approval its route requires (lifecycle spec).
- AC-HOOK-4.1 Given no active change, When the model edits `src/a.ts`, Then it is blocked with
  "ask the person to run `/sdd:new` and `/sdd:approve <id> route`".
- AC-HOOK-4.2 Given a quick change with `route` approved, When the model edits `src/a.ts`, Then it
  is allowed.
- AC-HOOK-4.3 Given a standard change with `spec` approved and no `tasks` approval, When the model
  edits `src/a.ts`, Then it is blocked naming `/sdd:approve <id> tasks`.
- AC-HOOK-4.4 Given `gates.enforce: false` or no `.sdd/config.yaml`, When the model edits
  `src/a.ts`, Then it is allowed.
- AC-HOOK-4.5 Given an autopilot worktree whose pointer names an approved change, When the
  implementer edits a file, Then it is allowed.

## REMOVED
None.

## Acceptance criteria
- AC-1 Given the current branch is `main` (the `base_branch`), When `/sdd:new` creates a change,
  Then the branch is `sdd/<id>` and the folder and pointer are on it.
- AC-2 Given the current branch is `feature/x`, When `/sdd:new` runs, Then the branch is unchanged.
- AC-3 Given `sdd/<id>` already exists, When `/sdd:new` would create it, Then it stops, names the
  branch and no change folder exists.
- AC-4 Given the pointer names change A that is absent from the checked-out branch and exactly one
  open change B exists, When status runs, Then B is active.
- AC-5 Given the pointer names an absent change and two open changes exist, When status runs, Then
  there is no active change and the gate blocks a source edit.
- AC-6 Given the pointer names a change present in the checkout, When status runs, Then that change
  is active even if other open changes exist.
- AC-7 Given init wrote files and the person accepts the commit offer, When it finishes, Then one
  commit `chore: adopt sdd` holds exactly the written paths and `git status` is clean.
- AC-8 Given the person declines the commit offer, When init ends, Then the written files are
  uncommitted and no commit was made.
- AC-9 Given a red then a green run recorded for a change, When `sdd tdd log <id>` runs, Then both
  are printed in order with exit codes.
- AC-10 Given no runs recorded or an unknown id, When `sdd tdd log <id>` runs, Then it prints
  "no runs recorded" and exits 0.
- AC-11 Given a quick change with a red then a green run in `sdd tdd log <id>`, When `/sdd:verify`
  runs, Then it reports the proving test as proven.
- AC-12 Given a quick change whose log has no red run, When `/sdd:verify` runs, Then it reports
  NO-GO naming the missing red run.
- AC-13 Given a dirty tree on `main`, When `/sdd:new` runs and the switch fails, Then it reports the
  failure, the branch stays `main` and no change folder exists.
- AC-14 Given the pointer names an archived change and no other change is open, When status runs,
  Then there is no active change.
- AC-15 Given no pointer and no open change, When status runs, Then there is no active change.
- AC-16 Given a detached HEAD with one open change, When status runs, Then that change is active.
- AC-17 Given AC-4, When status runs, Then the pointer file still names change A.
- AC-18 Given AC-4, When `sdd tdd red -- <cmd>` runs, Then the run is logged under change B.
- AC-19 Given files the person had already staged, When the commit offer is accepted, Then the
  commit does not contain them.

## Open questions
- NON-BLOCKING: after switching back to `base_branch` the pointer names a change that is absent;
  REQ-LIFE-13 resolves it to none, with no cleanup. Revisit if this confuses people.
- NON-BLOCKING: `tdd log` has no `--json` output in this change.
- NON-BLOCKING: if the init commit fails (for example a hook), the files stay written and
  uncommitted and the skill reports the error. On a fresh repo with no commits, `/sdd:new` stays on
  the current branch if it cannot switch.
- Out of scope: pointer cleanup, autopilot worktree branches, `/sdd:archive`, the hand-derived
  pointer paths in autopilot docs and evals.
- Task reminder: update `docs/specs/config.md` (pointer row) and `README.md` (`tdd log`) with the
  archive.
