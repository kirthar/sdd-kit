# Verification: configurable constitution path

## Commands run
- `node plugins/sdd/scripts/sdd.mjs validate 20261015-configurable-constitution-path` → `validate: ok`
- `node plugins/sdd/scripts/sdd.mjs validate --all` (configured lint) → `validate: ok`, no constitution warning
- `npm test` (configured test) → 327 tests, 319 pass, 0 fail
- Format and build: not configured for this package.
- Evals (`npm run eval:quick`): not run.

## Criterion evidence
| Criterion | Evidence (test, run, observation) | Result |
|---|---|---|
| AC-CFG-5.1 | `commands.test.mjs` "config prints the default constitution path"; `core.test.mjs` default | pass |
| AC-CFG-5.2 | `commands.test.mjs` "validate --all warns when the configured constitution is missing" | pass |
| AC-CFG-5.3 | `commands.test.mjs` "rejects absolute, parent and empty" (`/etc/constitution.md`) | pass |
| AC-CFG-5.4 | same test (`../c.md`) | pass |
| AC-CFG-5.5 | same test (`""`) | pass |
| AC-CFG-5.6 | same warning test, file present case | pass |
| AC-CFG-5.7 | same warning test, no-config case | pass |
| AC-RULE-3.1, 3.2 | existing context tests, unchanged and green | pass |
| AC-RULE-3.3 | `commands.test.mjs` "context prints the constitution from the configured path" | pass |
| AC-RULE-3.4 | `commands.test.mjs` "...from the default path" | pass |
| AC-RULE-3.5 | `commands.test.mjs` "context ignores a constitution path outside the project" | pass |
| AC-INIT-5.3 | `init.test.mjs` "plan records the constitution path only when it is not the default" | pass |
| AC-INIT-5.4 | `init.test.mjs` "apply writes the constitution only at the confirmed location" | pass |
| AC-1 | `validate --all` on this repository (config sets `docs/constitution.md`) printed no warning | pass |
| AC-INIT-5.1 | `validate.test.mjs` V-CONSTITUTION cases (size, ID, empty "Violated when", missing evidence file, generic wording); `sdd validate --all` passes on this repository and the example after adding Evidence columns | pass |
| AC-INIT-5.2 | `init.test.mjs` "re-running init keeps the configured constitution location"; mutating `constitutionLocation` makes it fail. The `init-constitution-path` eval (now invoked as `/sdd:init`) cannot run in the macOS eval sandbox, where git is unavailable | pass |

## Not verified locally
- The `init-constitution-path` eval (model-driven; needs `npm run eval`).
- `npm run validate` (`claude plugin validate`) and any CI-only checks.
- Hooks still guard only `.sdd/constitution.md`; out of scope, to state in the PR.

## Verdict
GO. AC-INIT-5.1 was implemented in this change as T7, by the maintainer's decision.
