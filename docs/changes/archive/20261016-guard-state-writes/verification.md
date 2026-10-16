# Verification: guard blocks every shell write to change state

## Commands run
- `node plugins/sdd/scripts/sdd.mjs validate 20261016-guard-state-writes` — ok
- `node plugins/sdd/scripts/sdd.mjs validate --all` (configured lint) — ok
- `npm test` (configured test) — 328 passed, 0 failed
- `node --test plugins/sdd/hooks/test/guard.test.mjs` — 179 passed, 0 failed
- Observed run: piped a `node -e` append to `docs/changes/c1/state.yaml` into `node plugins/sdd/hooks/guard.mjs` — exit 2, stderr names `/sdd:approve`

## Criterion evidence
| Criterion | Evidence (test, run, observation) | Result |
|---|---|---|
| AC-HOOK-1.1 | `guard.test.mjs` › "blocked shapes (AC-HOOK-1.1)" incl. "fixture has at least 45 cases"; exit 2 and hand-off line asserted by "end to end" › "blocked command exits 2 with reason and hand-off" | pass |
| AC-1 | row "node -e append to state.yaml" (and `node --eval`) blocked; observed run shows exit 2 with `/sdd:approve` in the reason | pass |
| AC-2 | rows "python3 -c write to state.yaml" and "bash -c python write" | pass |
| AC-3 | rows "ruby -e write", "dd of=" and "truncate state.yaml" | pass |
| AC-4 | allowed rows for `cat`, `grep`, `head`, `git diff`, `git log`, `git add`, `git commit`, `git restore --staged`, `sdd.mjs validate` | pass |
| AC-5 | allowed row `echo "see docs/changes/c1/state.yaml"` | pass |

- `node --test plugins/sdd/hooks/test/guard.test.mjs` after closing the review gaps — 184 pass; `npm test` — 333 pass

## Not verified locally
- CI result on the pull request.
- Run-time-built paths (for example string concatenation inside inline code) are not detected by design (ADR-0003); no test claims otherwise.
- The hand-off line drops the quotes of the blocked command (seen in the observed run); this predates the change and is outside its criteria.

## Verdict
GO
