# Verification: semantic squash merges and small stacked pull requests

## Commands run
- S1: `npm test` → 462 pass, 0 fail. `sdd validate --all` → exit 0 (one V-SIZE warning on the archived-pending delta of the previous change). `sdd scan --diff main` → no secrets.
- S1: `gh api repos/{owner}/{repo}` compared with `sdd forge-settings --json` → all 6 keys match.
- S2: `npm test` → 479 pass, 0 fail. `sdd validate --all` → exit 0. `npm run validate` → both manifests pass. `sdd scan --diff sdd/20261016-semantic-merge-small-prs` → no secrets. `sdd size --base sdd/20261016-semantic-merge-small-prs` → 152 counted, 202 excluded, budget 400: within.
- `sdd tdd log` shows a red run before green for each new test; one green run failed on a quoting error in the edited guard fixtures and passed after the fix.

## Criterion evidence
| Criterion | Evidence (test, run, observation) | Result |
|---|---|---|
| AC-1 | `merge.test.mjs` defaults via `sdd config --effective --json` | pass |
| AC-2 | `merge.test.mjs` V-CONFIG for `pr.merge`, `pr.max_lines` (0, 2.5), `pr.size_exclude` | pass |
| AC-3 | `guard.test.mjs` REQ-HOOK-7 blocks plain, unknown-type, empty, long, `-t`, `--title=` and `gh pr edit` titles | pass |
| AC-4 | `guard.test.mjs` allows scoped and `!` conventional titles | pass |
| AC-5 | `guard.test.mjs` allows any title with `commit.format: free` | pass |
| AC-6 | `merge.test.mjs` squash settings and one `gh api -X PATCH` command | pass |
| AC-7 | `merge.test.mjs` merge-commit settings use PR title and body | pass |
| AC-8 | `merge.test.mjs` `pr.forge: none` prints no command | pass |
| AC-9 | Observed: repository settings read back equal `sdd forge-settings` | pass |
| AC-10 | `merge.test.mjs` `sdd size` on fixture repositories: 500 counted, 300 excluded, over; binary skipped; custom budget and exclusions | pass |
| AC-11 | `slices.test.mjs` partial slices, gaps, start not at S1, interleaving, malformed slice | pass |
| AC-12 | `slices.test.mjs` dependency on a later slice names both tasks | pass |
| AC-13 | `slices.test.mjs` unsliced tasks have no finding | pass |
| AC-14 | `skills.test.mjs` tasks, implement, verify and pr texts (slices, stacked branches, restack) | pass |
| AC-15 | `skills.test.mjs` pr title follows `commit.format`, `## Size` when over; `pr` template slice line | pass |

## Not verified locally
- CI on the pull requests.
- The restack after a real squash merge (GitHub retargeting the S2 pull request to `main`) is
  observed only when S1 is merged.
- Model evals (`npm run eval`) were not run.

## Verdict
S1: GO. S2: GO.
