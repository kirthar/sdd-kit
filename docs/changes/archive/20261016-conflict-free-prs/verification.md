# Verification: conflict-free pull requests

## Commands run
- `npm test` → 493 pass, 0 fail. `sdd validate --all` → exit 0 (one V-SIZE warning on an earlier change's delta). `npm run validate` → both manifests pass.
- `sdd conflicts --base origin/main` → no conflicts (exit 0). `sdd size --base origin/main` → 208 counted, 394 excluded, budget 400: within. `sdd scan --diff origin/main` → no secrets.
- `sdd tdd log 20261016-conflict-free-prs` → a red run before green for every new test file; one green run of `skills.test.mjs` failed on the earlier assertion that required the old restack and passed after updating it.

## Criterion evidence
| Criterion | Evidence (test, run, observation) | Result |
|---|---|---|
| AC-1 | `restack.test.mjs` fixture stack: a plain merge conflicts; `sdd restack` exits 0, tree unchanged, main is an ancestor, clean tree. Also observed on pull request #13 by hand with the same steps | pass |
| AC-2 | `restack.test.mjs` later unrelated base commit is merged in | pass |
| AC-3 | `restack.test.mjs` slice head not in the branch → exit 1, HEAD unchanged | pass |
| AC-4 | `restack.test.mjs` dirty tree → exit 1, HEAD unchanged | pass |
| AC-5 | `restack.test.mjs` clashing base commit → exit 1 naming `a.txt`, merge in progress | pass |
| AC-6 | `restack.test.mjs` `sdd conflicts` exit 1 with the file; exit 0 and empty list after restack | pass |
| AC-7 | `changelog.test.mjs` entries folded under Added (created) and Fixed (existing), continuation lines kept | pass |
| AC-8 | `changelog.test.mjs` no `CHANGELOG.md` → archived, fold skipped | pass |
| AC-9 | `changelog.test.mjs` default `paths.changelog`; `../x.md` → V-CONFIG | pass |
| AC-10 | `skills.test.mjs` pr uses `sdd restack` and runs `sdd conflicts` before `gh pr ready`; implement and pr keep notes in `changelog.md`; archive mentions the fold | pass |

## Not verified locally
- CI on the pull request. Model evals were not run.

## Verdict
GO.
