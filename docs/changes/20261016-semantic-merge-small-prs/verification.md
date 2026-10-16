# Verification: semantic squash merges and small stacked pull requests

## Commands run
- S1: `npm test` → 462 pass, 0 fail. `sdd validate --all` → exit 0 (one V-SIZE warning on the archived-pending delta of the previous change). `sdd scan --diff main` → no secrets.
- S1: `gh api repos/{owner}/{repo}` compared with `sdd forge-settings --json` → all 6 keys match.

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

## Not verified locally
- CI on the pull requests.

## Verdict
S1: GO.
