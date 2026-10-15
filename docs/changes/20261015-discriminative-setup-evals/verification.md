# Verification: discriminative setup evals

## Commands run
- `node plugins/sdd/scripts/sdd.mjs validate --all` — ok
- `npm test` — 325 passed, 0 failed
- `claude plugin eval . --runs 1 --model sonnet --case <setup-*|verify-done>` — four runs of the setup
  cases and one of verify-done, each with and without the plugin

## Criterion evidence
| Criterion | Evidence (test, run, observation) | Result |
|---|---|---|
| AC-INT-1.3 | Each setup skill states `/sdd:sync`, the dry run and "nothing written before confirmation" before step 1; `names-sync` and `dry-run` pass in every run with the plugin | pass |
| AC-INT-1.4 | `no-write-before-confirmation` passes in every run | pass |
| AC-INT-5.1 | `names-sync` passes with the plugin in all three setup cases | pass |
| AC-INT-5.2 | `dry-run` passes with the plugin in all three setup cases | pass |
| AC-INT-5.3 | `no-write-before-confirmation` passes with the plugin | pass |
| AC-INT-5.4 | `checks-gh-auth` passes with the plugin in all four runs | pass |
| AC-INT-5.5 | `verification-written` passes with the plugin (after allowing Write and Edit in the case) | pass |
| AC-INT-5.6 | `names-missing-criteria` passes with the plugin | pass |
| AC-INT-5.7 (amended) | Without the plugin `names-sync`, `dry-run`, `verification-written` and `names-missing-criteria` fail in every run; the guards `no-write-before-confirmation` and `checks-gh-auth` pass with the plugin in every run | pass |
| AC-1 | Every remaining grader passes with the plugin; the discriminating graders fail without it | pass |

## Not verified locally
Three runs per case, as in the full suite, are part of the release eval run.

## Verdict
GO. AC-INT-5.7 was amended by the maintainer after the eval runs showed that the config and `gh auth`
graders guard against regressions rather than discriminate.
