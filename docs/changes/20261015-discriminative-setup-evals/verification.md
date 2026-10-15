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
| AC-INT-5.7 | Without the plugin `names-sync`, `dry-run`, `verification-written`, `names-missing-criteria` and the verdict fail in every run. `no-write-before-confirmation` passes without the plugin in every run (nothing writes the config without it), and `checks-gh-auth` passes without it in 3 of 4 runs | **fail as written** |
| AC-1 | All remaining graders pass with the plugin; see AC-INT-5.7 for the without-plugin arm | partial |

## Not verified locally
Three runs per case, as in the full suite, are part of the release eval run.

## Verdict
NO-GO until AC-INT-5.7 is decided: the config and `gh auth` graders are regression guards, not
discriminators. Proposed amendment (needs the person's decision): AC-INT-5.7 covers only the
`/sdd:sync`, dry-run and verification graders; AC-INT-5.3 and 5.4 stay as guards that must pass with
the plugin.
