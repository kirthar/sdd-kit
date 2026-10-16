## Why
Approvals live in `docs/changes/<id>/state.yaml` and may only be recorded by a person through
`/sdd:approve`. The guard hook already blocked redirects, `tee`, `sed -i` and `sdd approve`, but an
agent could still write the file with inline code (`node -e`, `python3 -c`, `ruby -e`) or with `dd`
and `truncate`, and so record its own approval. Found while investigating an eval run in which an
approval appeared that no person gave.

Change: `docs/changes/20261016-guard-state-writes/` (standard route, spec and tasks approved).

## Behaviour change
- Before: a Bash command that wrote a change `state.yaml` by any route other than the listed ones ran.
- After: any simple command whose text (quoted arguments and inline code included) names a
  `docs/changes/<id>/state.yaml` is blocked with exit 2, the reason and the `/sdd:approve` hand-off,
  unless its program only reads or stages: `cat`, `head`, `tail`, `less`, `more`, `grep`, `rg`, `wc`,
  `ls`, `stat`, `file`, `diff`, `echo`, `sdd.mjs validate|status|context`, and
  `git diff|log|show|status|add|commit|restore --staged`.
- Paths built at run time are not detected. This layer is a strong default, not a security
  boundary (ADR-0003).

## Review focus
- `checkStateNamed` / `namesStateOnlyToRead` in `plugins/sdd/hooks/guard.mjs`: an allowlist for
  reading, so the risk is a "read-only" program that can write.
- **Gaps found by the independent review, now closed test-first:** code passed to an interpreter through a
  heredoc is scanned, and write options of read-only programs (`git … --output`, `less -o`) no longer
  count as reads; `grep -o` stays allowed.

## Criteria
| Criterion | Evidence | Result |
|---|---|---|
| AC-HOOK-1.1 (≥45 blocked shapes exit 2 with reason and hand-off) | table test "blocked shapes", fixture-size check, end-to-end exit 2 test | pass |
| AC-1 `node -e` append blocks, names `/sdd:approve` | table row, `--eval` row, observed run | pass |
| AC-2 `python3 -c` write blocks | table rows incl. `bash -c` wrapper | pass |
| AC-3 `ruby -e`, `dd of=`, `truncate` block | table rows | pass |
| AC-4 `cat`, `grep`, `git diff`, `git add`, `git commit` allowed | allowed rows | pass |
| AC-5 `echo "see …/state.yaml"` allowed | allowed row | pass |

The table test asserts a non-empty reason; that the reason names `/sdd:approve` is shown by the
observed run, not by an assertion.

## Evidence
Run locally before this PR:
- `node plugins/sdd/scripts/sdd.mjs validate 20261016-guard-state-writes` — ok
- `node plugins/sdd/scripts/sdd.mjs validate --all` — ok
- `npm test` — 328 passed, 0 failed
- `node --test plugins/sdd/hooks/test/guard.test.mjs` — 184 passed, 0 failed; `npm test` — 333 passed
- `node plugins/sdd/scripts/sdd.mjs scan --diff main` — no secrets found
- Observed: a `node -e` append to `docs/changes/c1/state.yaml` piped into the guard exits 2 and
  names `/sdd:approve`.

Only CI confirms the result on the pull request. The independent review could not run git or the
tests; its scope check was done by hand: the diff touches only the two expected paths plus this
change folder.

## To confirm
- [ ] Maintainer: the allowlist matches what agents legitimately need to do with state files.
- [ ] Developers: `docs/specs/hooks.md` (blocked-shapes table) is updated when the delta is archived.

## Beyond the task
Nothing beyond the approved paths. Noticed and left alone: the hand-off line drops the quotes of
the blocked command. It predates this change and needs its own.
