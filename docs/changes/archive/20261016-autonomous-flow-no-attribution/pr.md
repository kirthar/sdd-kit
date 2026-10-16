## Why
A standard change used to need five or more prompts: the agent stopped after every phase and
every task to offer to continue, although the person had already decided. People want to be asked
twice — to confirm the route and to approve one complete plan — and then get a pull request ready
for review. Separately, commits and pull requests must never credit an AI assistant as co-author.
Change folder: `docs/changes/20261016-autonomous-flow-no-attribution/` · ADR-0008.

## Behaviour change
- **Before:** route → spec → approve → tasks → approve → one task per prompt → verify → draft PR
  that the person marks ready.
- **After:** route → the agent asks every question up front, writes spec and tasks →
  `/sdd:approve <id> plan` (records functional, spec and tasks in one act) → every task, verify,
  test plan and PR in one run → PR marked ready once verification is GO (`pr.auto_ready`, now
  `true` by default). Per-phase approvals still work.
- `sdd status` names the first missing planning artifact, then `/sdd:approve <id> plan`.
- `guard` blocks commits and `gh pr create|edit` with an AI co-author or a "Generated with" line
  naming one; `sdd validate` flags those lines in open `pr.md` files (V-ATTRIBUTION). The author's
  own signature (`-S`, `-s`, `Signed-off-by:`) and human co-authors are allowed.

## Review focus
- `plugins/sdd/scripts/lib/approve.mjs`: `plan` validates every pending artifact before writing
  anything; check the order checks still refuse out-of-order single phases.
- `plugins/sdd/scripts/lib/changes.mjs` `derivePhase`: spec and tasks are written before approval;
  the gate still requires every approval before code (`codeWritesAllowed` is unchanged).
- `plugins/sdd/scripts/lib/attribution.mjs`: the two line-anchored patterns, shared by guard and
  validate — false positives would block legitimate commits.
- `pr.auto_ready` default flip (K3): marking ready is not a merge or review request; ADR-0008.

## Criteria
Covered: AC-1 … AC-15, AC-LIFE-3.3, AC-LIFE-5.5, AC-LIFE-5.6, AC-LIFE-9.1, AC-LIFE-9.3,
AC-LIFE-14.1, AC-LIFE-14.2, AC-VAL-6.1, AC-VAL-6.2, AC-CFG-2.1 — see `verification.md`.

## Evidence
- `npm test` → 438 pass, 0 fail. `sdd validate --all` → exit 0 (one V-SIZE warning on the delta).
- `npm run validate` → manifests pass. `sdd scan --diff main` → no secrets.
- `sdd tdd log` shows red before green for each new test file.
- Not run: model evals (`npm run eval`); CI confirms the rest.

## To confirm
- [ ] Product: two interaction points (route, plan) are the intended contract for every route.
- [ ] Maintainers: `pr.auto_ready: true` as the default is acceptable for adopters (CHANGELOG notes it).
- [ ] Developers: run `npm run eval` for `status-next-step` and `neg-agent-cannot-approve`.

## Beyond the task
- `.sdd/config.yaml` of this repo now sets `auto_ready: true`; `.sdd/rules.md` gains R11 and R3
  allows ready after GO; the seed rules gain R16.
- The `gh pr ready` blocked-shape row moved from the default-config table to an explicit
  `auto_ready: false` test, since the default changed.
