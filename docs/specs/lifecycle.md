# Spec: lifecycle (routes, changes, approvals, skills)

Status: current · Cites: K2, K3, K4, K9, K10 · ADRs: 0001, 0002, 0003

## Purpose
Carry a change from idea to merged, with ceremony proportional to its size and a human act at
every transition.

## Change folder
`docs/changes/<id>/`, `<id>` = `<yyyymmdd>-<slug>` (`[a-z0-9-]`, ≤60 chars).

| Route | Artifacts |
|---|---|
| quick | `state.yaml`, `brief.md` |
| standard | `state.yaml`, `delta.md`, `tasks.md`, `test-plan.md`, `verification.md`, `pr.md`, `plans/` |
| full | as standard, with `functional.md` + `technical.md` + `contracts/` instead of `delta.md`; ADRs in `docs/adr/` |

`state.yaml`:
```yaml
id: 20261015-booking-cancel
route: standard
capabilities: [bookings]
route_override: { from: full, signals: [new-public-contract] }   # only when overridden
approvals:            # written only by /sdd:approve (human act)
  route: { by: <git user.name>, at: <iso8601> }
  functional: …       # full only
  spec: …             # standard (delta.md) and full (technical.md)
  tasks: …
  plans: { T3: … }    # autopilot lane B
prs: [<url>]
```
The phase is **derived**, never stored: `sdd status` computes it from artifacts and approvals.

Required approvals before code may be written: quick → `route`; standard → `route`, `spec`,
`tasks`; full → `route`, `functional`, `spec`, `tasks`.

## Requirements

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

### REQ-LIFE-2: Functional spec
`/sdd:refine` (auto, full only). Clarification sweep over 8 angles; asks only where
docs and code are silent; ≤4 questions per batch, each with options and a recommendation; answers
written in place; criteria `AC-<n>` (Given/When/Then), out-of-scope criteria explicit; requirements
lint; open questions under `## Open questions` marked BLOCKING or NON-BLOCKING.
- AC-LIFE-2.1 Given an open BLOCKING question, When refine ends, Then `functional.md` lists it and
  `sdd validate` refuses a `functional` approval (V-OPEN-Q).
- AC-LIFE-2.2 Given a quick or standard change, When refine is invoked, Then it refuses and names
  the right next command.

### REQ-LIFE-3: Technical spec
`/sdd:spec` (auto, standard and full). Invokes `sdd-researcher` first and records
reuse candidates and duplicates in `## Reuse`. Standard: `delta.md` (ADDED / MODIFIED / REMOVED,
criteria). Full: `technical.md` + `contracts/*.yaml` + `## Living spec deltas`, and an ADR for
every decision with rejected alternatives. Then `sdd-spec-reviewer` and `sdd validate`.
- AC-LIFE-3.1 Given a quick change, When spec is invoked, Then it refuses and no file is created.
- AC-LIFE-3.2 Given the researcher reports an existing component covering a requirement, When the
  spec is written, Then `## Reuse` links that file.
- AC-LIFE-3.3 Given full with no `functional` approval, When spec is invoked, Then it stops and names
  `/sdd:approve <id> functional`.

### REQ-LIFE-4: Tasks
`/sdd:tasks` (auto). Requires `spec` approval. Writes `## T<n>: <imperative>`
blocks with Covers, Expected paths (globs), Outermost test (behaviour + layer), Depends on, Package.
Every prefix of the order is releasable; a breaking contract becomes expand / migrate / contract
tasks. Then `sdd-spec-reviewer` and `sdd validate`.
- AC-LIFE-4.1 Given generated tasks, When `sdd validate` runs, Then V-TRACE and V-TASK-FIELDS pass.

### REQ-LIFE-5: Approve
`/sdd:approve <id> <phase>[ route=<route>]` (user-only). The write runs through
the skill's pre-execution shell injection, so it happens as part of the person's act, not as a
model tool call. `sdd approve` validates `<id>` and `<phase>` against strict patterns, refuses when an
earlier phase is not approved yet, when the phase artifact does not exist or fails validation, records
`by` and `at`, and prints the next command.
- AC-LIFE-5.1 Given the model runs `sdd approve` through the Bash tool, When the guard hook
  evaluates it, Then it is blocked with a hand-off to `/sdd:approve`.
- AC-LIFE-5.2 Given a delta failing V-SECTIONS, When the person approves `spec`, Then the approval
  is refused with the findings.
- AC-LIFE-5.3 Given an id containing `;`, When approve runs, Then it exits 2 and writes nothing.
- AC-LIFE-5.4 Given a standard change without `spec` approval, When the person approves `tasks`, Then
  it is refused naming `spec`.

### REQ-LIFE-6: Implement
`/sdd:implement [T<n>]` (auto). With `testing.tdd: strict`: for each small step,
write one test, run it through `sdd tdd red -- <cmd>` (must fail), write the minimum code, run
`sdd tdd green -- <cmd>` (must pass), refactor, commit. Format and lint first and commit their
rewrites; then the configured tests; then a clean tree. Marks the task done. Stops after each task,
and immediately if the diff leaves the task's Expected paths or touches a tripwire.
- AC-LIFE-6.1 Given strict TDD, When a task is implemented, Then the tdd log shows a red run
  before the first green run for each test file touched.
- AC-LIFE-6.2 Given a diff outside Expected paths, When the step ends, Then implement stops and
  reports the extra paths.

### REQ-LIFE-7: Verify
`/sdd:verify` (auto). Runs `sdd validate`, the configured lint and tests, and builds
a criterion → evidence matrix in `verification.md` (standard and full). For quick, it reads
`sdd tdd log <id>` and checks that the proving test from `brief.md` ran red and then green, and
reports to the terminal only. Lists the exact commands and what only CI confirms.
- AC-LIFE-7.1 Given a criterion with no evidence, When verify runs, Then `verification.md` says
  NO-GO and names the criterion.
- AC-LIFE-7.2 Given a quick change, When verify runs, Then no file is written.

### REQ-LIFE-8: Test plan
`/sdd:test-plan` (auto, standard and full). One case per criterion, classified
automated / manual / developer-level; `BLOCKED — <missing>` instead of invented data.
- AC-LIFE-8.1 Given 5 criteria, When test-plan runs, Then the table has ≥5 cases and each criterion
  ID appears at least once.

### REQ-LIFE-9: Pull request
`/sdd:pr` (auto). Runs `sdd scan` on the diff and the body first. Standard and full:
`sdd-pr-reviewer`, then a behaviour-first body from `pr.md`. Quick: a ≤20-line body from
`pr-quick.md`, no reviewer subagent. Opens a draft PR with an explicit base when
`pr.forge: github` and `gh` work; otherwise writes the body to the change folder. Records the URL.
- AC-LIFE-9.1 Given `gh` is available, When pr runs, Then the PR is a draft and has no reviewers.
- AC-LIFE-9.2 Given `pr.forge: none`, When pr runs, Then the body is written and no forge command
  is executed.

### REQ-LIFE-10: Archive
`/sdd:archive <id>` (user-only). Defined in the validation spec; applies to every
route.

### REQ-LIFE-11: Status
`/sdd:status [<id>]` (auto, read-only). Open changes with route, derived phase,
missing approvals and next command.
- AC-LIFE-11.1 Given a standard change with spec approved, When status runs, Then the next command
  is `/sdd:tasks`.

### REQ-LIFE-12: Adopt
`/sdd:adopt [<area>]` (user-only). `sdd-researcher` drafts
`docs/specs/<cap>.md` with `status: unverified` and a source-file link per requirement.
- AC-LIFE-12.1 Given adopt on a fixture repo, When it ends, Then every drafted requirement has at
  least one file link and V-UNVERIFIED warns.

### REQ-LIFE-13: Active change follows the branch
The active change is resolved, never assumed from the pointer alone. If the pointer names a change
whose folder exists (not archived) in the current checkout, that is the active change. Otherwise,
if exactly one open change exists in the checkout, that is the active change. With none or several,
there is no active change. An archived change is not open. Resolution only reads and never
rewrites the pointer file, and every reader (`status`, `context`, `tdd`, the approval gate) uses it.
- A detached HEAD or an unborn branch resolves like any other checkout.
- No active change keeps the approval gate closed (REQ-HOOK-4).

## Subagents

| Agent | Tools | Contract |
|---|---|---|
| `sdd-researcher` | Read, Grep, Glob | Reuse candidates, duplicates, affected capabilities, risks; every claim links a file |
| `sdd-spec-reviewer` | Read, Grep, Glob | Findings vs template, 8 angles, constitution, rules; BLOCKING / NON-BLOCKING |
| `sdd-pr-reviewer` | Read, Grep, Glob, Bash | Read-only git only (enforced by guard): merge-base scope, criterion → test gaps as probes, scope beyond Expected paths |
| `sdd-coordinator` | Read, Grep, Glob, Agent | Splits a multi-package task, briefs implementers, checks cross-package contracts; writes nothing |
| `sdd-implementer` | Read, Grep, Glob, Edit, Write, Bash | One task in one worktree, strict TDD, commits, never pushes; returns commands run and results |

## History
