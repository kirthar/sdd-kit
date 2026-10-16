# Verification: autonomous flow after approval and no AI attribution

## Commands run
- `node plugins/sdd/scripts/sdd.mjs validate --all` → exit 0; one warning: V-SIZE `delta.md` 143 lines (budget 120, error above 180).
- `npm test` → exit 0; 438 tests, 438 pass, 0 fail.
- `npm run validate` (plugin and marketplace manifests) → both pass.
- `node plugins/sdd/scripts/sdd.mjs scan --diff main` → no secrets found.
- `node plugins/sdd/scripts/sdd.mjs tdd log 20261016-autonomous-flow-no-attribution` → a red run before the first green run for every new test file (`plan`, `guard`, `validate`, `ready`, `skills`).

## Criterion evidence
| Criterion | Evidence (test, run, observation) | Result |
|---|---|---|
| AC-1, AC-LIFE-5.5 | `plan.test.mjs` "plan records spec and tasks in one act on standard" (CLI) | pass |
| AC-2 | `plan.test.mjs` "plan records functional, spec and tasks on full" (CLI) | pass |
| AC-3, AC-LIFE-5.6 | `plan.test.mjs` "refuses and writes nothing when tasks.md is missing" / "fails validation" | pass |
| AC-4 | `plan.test.mjs` "plan is refused on quick" | pass |
| AC-5 | `plan.test.mjs` "status asks for the plan approval once delta and tasks are written"; `core.test.mjs` phase derivation | pass |
| AC-6 | `plan.test.mjs` "status sends an unapproved delta on to tasks" | pass |
| AC-7 | `guard.test.mjs` "commit -m with an AI co-author" and five more commit shapes (`-m` twice, `--message=`, `--trailer`, heredoc, `-F` file and `-F -`) | pass |
| AC-8 | `guard.test.mjs` allows `git commit -S -s -m` and `--gpg-sign --signoff` | pass |
| AC-9 | `guard.test.mjs` `gh pr create --body`, `--body-file`, heredoc body and `gh pr edit --body` | pass |
| AC-10 | `guard.test.mjs` allows a human `Co-authored-by:` and a human `Signed-off-by:` | pass |
| AC-11, AC-VAL-6.1 | `validate.test.mjs` V-ATTRIBUTION with file and line | pass |
| AC-12, AC-VAL-6.2 | `validate.test.mjs` "archived changes are not checked"; `validate --all` on this repo, whose archived `pr.md` files carry the footer, reports none | pass |
| AC-13, AC-CFG-2.1 | `ready.test.mjs` `sdd config --effective --json` (CLI) | pass |
| AC-14 | `ready.test.mjs` "init writes auto_ready: true" | pass |
| AC-15, AC-LIFE-14.1, AC-LIFE-14.2 | `skills.test.mjs` checks every flow skill's text (no stop-and-offer, next command named, one `plan` request, every remaining task then verify) | pass |
| AC-LIFE-3.3 | `skills.test.mjs` spec skill needs `functional.md` without BLOCKING questions, not the approval | pass |
| AC-LIFE-9.1, AC-LIFE-9.3 | `skills.test.mjs` pr skill runs `gh pr ready` only with `pr.auto_ready` and GO; `guard.test.mjs` blocks `gh pr ready` when `auto_ready: false`, `ready.test.mjs` allows it under defaults | pass |

## Not verified locally
- The behavioural evals (`npm run eval`) were not run: they call a model and cost tokens. The
  changed graders (`status-next-step`, `neg-agent-cannot-approve`) and the end-to-end agent
  behaviour of AC-LIFE-14.1/14.2 are confirmed only by an eval run or by using the plugin.
- CI on the pull request.

## Verdict
GO. Every criterion has a passing test; the agent-behaviour criteria rest on skill-text contract
tests, and the evals listed above remain to run.
