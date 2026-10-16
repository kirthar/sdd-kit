# Delta: autonomous flow after approval and no AI attribution

## Why
Today the agent stops after every phase and every task and asks the person to continue, so a
standard change needs five or more interactions. People want two moments only: confirm the route,
and review one complete plan (questions answered, spec and tasks written). After the last approval
the agent implements every task, verifies and leaves the pull request ready for review. Separately,
commits and pull requests must never credit an AI assistant as co-author; the author may still sign them.

## Reuse
- `plugins/sdd/scripts/lib/approve.mjs` already validates one phase's artifact and records `by`/`at`;
  the `plan` phase loops over the same checks.
- `plugins/sdd/scripts/lib/changes.mjs` `derivePhase` / `nextCommand` drive `status` and the
  approve hand-off; they gain the `plan-approval` phase.
- `plugins/sdd/hooks/guard.mjs` already reads `-m`, heredoc bodies and `--body-file` for the
  Mentions group; the Attribution group reuses that parsing. `gh pr ready` is already allowed when
  `pr.auto_ready`.
- `plugins/sdd/scripts/lib/validate.mjs` hosts V-LEAK; V-ATTRIBUTION sits beside it.

## ADDED
### REQ-LIFE-14: Interaction points
A change asks the person at fixed moments only: the route (every route) and one plan review
(standard and full). Before writing any planning artifact the agent asks every clarification
question in consecutive batches of at most 4. After `/sdd:approve <id> route` on standard or full it
writes, without stopping, the functional spec (full), the spec and the tasks, then asks once for
`/sdd:approve <id> plan`. After the last required approval it runs, without stopping, every task in
order, `/sdd:verify`, `/sdd:test-plan` (standard and full) and `/sdd:pr`. It stops early only on a
refused approval, a BLOCKING open question, a step leaving Expected paths or touching a tripwire,
a failing test it cannot fix within the task, a NO-GO verification or a secret finding, and then
names the reason and the exact next command.
- AC-LIFE-14.1 Given a standard change whose route the person just approved, When the agent
  continues, Then `delta.md` and `tasks.md` exist and the only question asked is the `plan` approval.
- AC-LIFE-14.2 Given a change with every required approval, When the person's approval returns,
  Then the agent implements all tasks and opens the pull request without asking to continue.

### REQ-VAL-6: No AI attribution
V-ATTRIBUTION (error) flags, in `pr.md` of every open change, a `Co-authored-by:` line naming an AI
assistant (`claude`, `anthropic`) or a "Generated with/by" line naming one. `Signed-off-by:` by the author is allowed.
Archived changes are not checked. Matching is case-insensitive.
- AC-VAL-6.1 Given an open change whose `pr.md` ends with "Generated with [Claude Code]", When
  `sdd validate <id>` runs, Then it exits 1 with `V-ATTRIBUTION docs/changes/<id>/pr.md:<line>`.
- AC-VAL-6.2 Given the same line in an archived `pr.md`, When `sdd validate --all` runs, Then no
  V-ATTRIBUTION finding is reported.

## MODIFIED
### REQ-HOOK-1: Blocked shapes

| Group | Blocked |
|---|---|
| Push | `--force`, `-f`, `--force-with-lease`, `--force-if-includes`, `+<ref>` refspecs, `--delete`/`-d`, `:<ref>` deletion, `--mirror`, `--prune`, `--no-verify`; any compound command (`;`, `&&`, `\|\|`, `\|`, `$(`, backticks) containing a push |
| History | `commit --amend`; `rebase` when `git.integration: merge`; `filter-branch`; `filter-repo`; `reflog expire\|delete`; `update-ref -d` |
| Local destruction | `branch -D` / `--delete --force`; `reset --hard`; `clean -f…`; `checkout -- <path>` / `restore` without `--staged`; `worktree remove --force`; `stash drop\|clear` |
| Forge | `gh pr merge`; `gh pr review`; `--reviewer` / `--add-reviewer`; `gh pr ready` unless `pr.auto_ready`; `gh pr create` without `--draft` when `pr.draft`; `gh repo delete`; `gh api` with DELETE or a merge/review endpoint |
| Escape hatches | `git config` writes to `alias.*`, `push.*`, `receive.*`, `remote.*.push`, `url.*`, `core.hooksPath`; `commit --no-verify` |
| Mentions | `@handle` in `gh pr\|issue create\|comment\|edit` bodies and `--body-file` contents, outside inline or fenced code |
| Attribution | A commit message (`-m`, `-F`, `--trailer`, heredoc) or `gh pr create\|edit` title, body or `--body-file` with a `Co-authored-by:` line naming an AI assistant (`claude`, `anthropic`) or a "Generated with/by" line naming one. The author's own signature (`-S`, `-s`, `Signed-off-by:`) is allowed |
| Approvals | `sdd.mjs approve` from the Bash tool; any simple command whose text, including quoted arguments, inline code, heredoc bodies and write options, names a `state.yaml` under `docs/changes/`, unless its program only reads or stages (`cat`, `head`, `tail`, `less`, `more`, `grep`, `rg`, `wc`, `ls`, `stat`, `file`, `diff`, `echo` without redirect, `node <sdd.mjs> validate\|status\|context`, `git diff\|log\|show\|status\|add\|commit\|restore --staged`) |
| Autopilot mode only | Any git verb other than `fetch`, `worktree add\|list\|remove\|prune` and read-only verbs against the main checkout; writes to `.sdd/config.yaml`, `.sdd/rules.md`, `.sdd/constitution.md` |

Paths built at run time are not detected; this layer is a strong default, not a security boundary
(ADR-0003).
- AC-HOOK-1.1 Given each blocked shape in the fixture table (≥45 cases), When guard evaluates it,
  Then it exits 2 with the reason and the hand-off line.

### REQ-LIFE-3: Technical spec
`/sdd:spec` (auto, standard and full). Invokes `sdd-researcher` first and records
reuse candidates and duplicates in `## Reuse`. Standard: `delta.md` (ADDED / MODIFIED / REMOVED,
criteria). Full: `technical.md` + `contracts/*.yaml` + `## Living spec deltas`, and an ADR for
every decision with rejected alternatives. Then `sdd-spec-reviewer` and `sdd validate`. On full it
needs `functional.md` with no BLOCKING open question (approved or not), and continues to `/sdd:tasks`.
- AC-LIFE-3.1 Given a quick change, When spec is invoked, Then it refuses and no file is created.
- AC-LIFE-3.2 Given the researcher reports an existing component covering a requirement, When the
  spec is written, Then `## Reuse` links that file.
- AC-LIFE-3.3 Given full with no `functional.md` or one with a BLOCKING open question, When spec is
  invoked, Then it stops and names `/sdd:refine` or the question.

### REQ-LIFE-4: Tasks
`/sdd:tasks` (auto). Requires a spec artifact that validates (approved or not). Writes `## T<n>: <imperative>`
blocks with Covers, Expected paths (globs), Outermost test (behaviour + layer), Depends on, Package.
Every prefix of the order is releasable; a breaking contract becomes expand / migrate / contract
tasks. Then `sdd-spec-reviewer` and `sdd validate`, and asks for `/sdd:approve <id> plan`.
- AC-LIFE-4.1 Given generated tasks, When `sdd validate` runs, Then V-TRACE and V-TASK-FIELDS pass.

### REQ-LIFE-5: Approve
`/sdd:approve <id> <phase>[ route=<route>]` (user-only). The write runs through
the skill's pre-execution shell injection, so it happens as part of the person's act, not as a
model tool call. `sdd approve` validates `<id>` and `<phase>` against strict patterns, refuses when an
earlier phase is not approved yet, when the phase artifact does not exist or fails validation, records
`by` and `at`, and prints the next command. The phase `plan` (standard and full) records, in one act
and with the same `by` and `at`, every planning phase of the route that is not approved yet
(`functional` on full, `spec`, `tasks`); it requires `route`, and refuses, writing nothing, when any
of those artifacts is missing or fails validation. After a successful approval the skill continues
with the next command in the same turn when that command is the agent's to run.
- AC-LIFE-5.1 Given the model runs `sdd approve` through the Bash tool, When the guard hook
  evaluates it, Then it is blocked with a hand-off to `/sdd:approve`.
- AC-LIFE-5.2 Given a delta failing V-SECTIONS, When the person approves `spec`, Then the approval
  is refused with the findings.
- AC-LIFE-5.3 Given an id containing `;`, When approve runs, Then it exits 2 and writes nothing.
- AC-LIFE-5.4 Given a standard change without `spec` approval, When the person approves `tasks`, Then
  it is refused naming `spec`.
- AC-LIFE-5.5 Given a standard change with `route` approved and valid `delta.md` and `tasks.md`,
  When the person approves `plan`, Then `spec` and `tasks` are recorded and the next command is
  `/sdd:implement`.
- AC-LIFE-5.6 Given a standard change with no `tasks.md`, When the person approves `plan`, Then it is
  refused naming `tasks.md` and `state.yaml` is unchanged.

### REQ-LIFE-6: Implement
`/sdd:implement [T<n>]` (auto). With `testing.tdd: strict`: for each small step,
write one test, run it through `sdd tdd red -- <cmd>` (must fail), write the minimum code, run
`sdd tdd green -- <cmd>` (must pass), refactor, commit. Format and lint first and commit their
rewrites; then the configured tests; then a clean tree. Marks each task done. Without `T<n>` it
implements every remaining task in dependency order and then continues to `/sdd:verify`; with
`T<n>` it implements that task only. It stops immediately if the diff leaves the task's Expected
paths or touches a tripwire. Commits never name an AI assistant as co-author; the author's signature is allowed.
- AC-LIFE-6.1 Given strict TDD, When a task is implemented, Then the tdd log shows a red run
  before the first green run for each test file touched.
- AC-LIFE-6.2 Given a diff outside Expected paths, When the step ends, Then implement stops and
  reports the extra paths.

### REQ-LIFE-9: Pull request
`/sdd:pr` (auto). Runs `sdd scan` on the diff and the body first. Standard and full:
`sdd-pr-reviewer`, then a behaviour-first body from `pr.md`. Quick: a ≤20-line body from
`pr-quick.md`, no reviewer subagent. Opens a draft PR with an explicit base when
`pr.forge: github` and `gh` work; otherwise writes the body to the change folder. Records the URL.
When `pr.auto_ready` is true and verification is GO (quick: the proving test ran red then green),
it then marks the PR ready for review. The body carries no AI attribution line (REQ-VAL-6).
- AC-LIFE-9.1 Given `gh` is available and `pr.auto_ready: false`, When pr runs, Then the PR is a
  draft and has no reviewers.
- AC-LIFE-9.2 Given `pr.forge: none`, When pr runs, Then the body is written and no forge command
  is executed.
- AC-LIFE-9.3 Given `pr.auto_ready: true` and a GO verification, When pr runs, Then it runs
  `gh pr ready` after `gh pr create --draft` and requests no reviewers.

### REQ-CFG-2: Defaults
Missing keys take the defaults above; `sdd config --effective` prints the
merged result. `pr.auto_ready` defaults to `true`, and `sdd init` writes `auto_ready: true`.
- AC-CFG-2.1 Given a config with only `version: 1`, When `sdd config --effective` runs, Then
  `gates.enforce` is `true`, `pr.draft` is `true` and `pr.auto_ready` is `true`.

## REMOVED

## Acceptance criteria
- AC-1 Given a standard change with `route` approved and valid `delta.md` and `tasks.md`, When `sdd approve <id> plan` runs, Then `spec` and `tasks` are recorded with the same `by` and `at`.
- AC-2 Given a full change with `route` approved and valid `functional.md`, `technical.md` and `tasks.md`, When `sdd approve <id> plan` runs, Then `functional`, `spec` and `tasks` are recorded.
- AC-3 Given `tasks.md` missing or failing validation, When `sdd approve <id> plan` runs, Then it exits 1 naming the artifact and `state.yaml` is unchanged.
- AC-4 Given a quick change, When `sdd approve <id> plan` runs, Then it is refused because the route has no plan approval.
- AC-5 Given a standard change with `route` approved and both `delta.md` and `tasks.md` written, When `sdd status` runs, Then the next command is `/sdd:approve <id> plan`.
- AC-6 Given a standard change with `route` approved and only `delta.md` written, When `sdd status` runs, Then the next command is `/sdd:tasks`.
- AC-7 Given `git commit -m` whose message has a `Co-Authored-By:` line naming Claude, When guard evaluates it, Then it blocks with the hand-off line.
- AC-8 Given `git commit -S -s -m "x"` (the author's GPG signature and sign-off), When guard evaluates it, Then it allows.
- AC-9 Given `gh pr create` or `gh pr edit` whose `--body` or `--body-file` contains "Generated with [Claude Code]", When guard evaluates it, Then it blocks.
- AC-10 Given `git commit -m` with a `Co-authored-by:` line naming a person, When guard evaluates it, Then it allows.
- AC-11 Given an open change whose `pr.md` has an AI attribution line, When `sdd validate <id>` runs, Then it exits 1 with V-ATTRIBUTION and the line.
- AC-12 Given the same line in an archived change, When `sdd validate --all` runs, Then no V-ATTRIBUTION finding is reported.
- AC-13 Given a config with only `version: 1`, When `sdd config --effective` runs, Then `pr.auto_ready` is `true`.
- AC-14 Given `sdd init --apply` on a fresh repository, When it writes `.sdd/config.yaml`, Then `pr` has `auto_ready: true`.
- AC-15 Given the approve, refine, spec, tasks, implement and pr skills, When their text is read, Then none tells the agent to stop and offer to continue after an approval or after one task, and each names the next command it runs.

## Open questions
