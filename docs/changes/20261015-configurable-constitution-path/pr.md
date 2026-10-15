# Configurable constitution path

## Why
The kit reads and writes the project constitution only at `.sdd/constitution.md`. Projects that keep it elsewhere
(this repository uses `docs/constitution.md`) get no constitution in `sdd context`, and init would create a second
file. Change: `docs/changes/20261015-configurable-constitution-path/` (standard route, delta approved).

## Behaviour change
- **Config:** new `paths.constitution` key, default `.sdd/constitution.md`. A wrong type is an error under REQ-CFG-1.
  An empty, absolute or `..` value is an error on `V-CONFIG paths.constitution`.
- **`sdd validate`:** warns (exit 0) when the configured file is missing and `.sdd/config.yaml` exists.
  It is silent when the file exists or there is no config.
- **`sdd context`:** prints the constitution from the configured path. An invalid or out-of-root value is treated
  as unset and nothing outside the project is read.
- **`/sdd:init`:** proposes the existing configured location on re-run. It records `paths.constitution` in the
  proposed config only when it differs from the default, and writes the constitution only there.
- **This repository:** now configures `docs/constitution.md`. The literal default path is replaced in
  `AGENTS.md`, the agents-section template, the spec-reviewer agent, `docs/teams.md` and the bookings example.

## Review focus
- `plugins/sdd/scripts/lib/config.mjs`: the path check (`isProjectRelative`) is the one rule. `context`, `init` and
  `validate` all call it, so they agree. Check the edge cases (Windows-style absolute, `a/../b`).
- `plugins/sdd/scripts/lib/init.mjs`: plan and apply must never write outside the project root.
- Hooks are **not** changed: `hooks/gate.mjs` and `hooks/guard.mjs` still protect only `.sdd/constitution.md`.

## Criteria
Covered by tests: AC-CFG-5.1 to 5.7, AC-RULE-3.3 to 3.5, AC-INIT-5.3, AC-INIT-5.4 (the others, AC-RULE-3.1 and
3.2, are existing tests, still green). AC-1 was observed by running `validate --all` on this repository, with no
automated test. Details: `docs/changes/20261015-configurable-constitution-path/verification.md`.

**Notes:**
- AC-INIT-5.2: covered by a script test (`init.test.mjs`, checked by mutation); the eval cannot run in the
  macOS eval sandbox, where git is unavailable.
- AC-INIT-5.1: `validate.mjs` has no constitution size or denylist check. This gap predates this change and was
  reported, not fixed.

## Evidence
- `node plugins/sdd/scripts/sdd.mjs validate 20261015-configurable-constitution-path` → ok
- `node plugins/sdd/scripts/sdd.mjs validate --all` → ok, no constitution warning
- `npm test` → 320 tests, 320 pass, 0 fail
- Secret scan, `sdd scan --diff main` → no secrets found
- Not run locally: `npm run eval` (model-driven), `npm run validate` (`claude plugin validate`), CI-only checks.
  No format or build step is configured.
- Verification verdict is **NO-GO** on AC-INIT-5.1 only, until the maintainer decides it.

## To confirm
- [ ] Maintainer: waive AC-INIT-5.1, or move the missing size and denylist check to its own change.
- [ ] Maintainer: accept that `docs/constitution.md` has no autopilot write protection until the hooks follow-up.
- [ ] Reviewers: check that `paths.constitution` values like `C:\x` and `a/../b.md` are rejected.

## Beyond the task
- **Living specs.** The requirement deltas are folded into `docs/specs/` by `/sdd:archive` after the merge,
  not by T6; T6 only updated the schema block of `docs/specs/config.md`.
- A stray formatting fix in `docs/specs/rules.md` (REQ-RULE-1 code fence on its own block).
- Follow-ups, out of scope: hook write protection for a moved constitution; V-LEAK scans only `docs/` and `.sdd/`.

Base: `main`. Open as draft.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
