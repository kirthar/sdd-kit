# Delta: guard blocks every shell write to change state

## Why
Approvals live in `docs/changes/<id>/state.yaml` and must only be written by the person's
`/sdd:approve`. The guard hook blocks redirects, `tee`, `sed -i`, `perl -i` and `sdd approve`, but an
agent can still write the file with an inline interpreter (`node -e`, `python3 -c`, `ruby -e`) or with
`dd` and `truncate`, and so record its own approval. Found while investigating an eval run in which
an approval appeared that no person gave.

## Reuse
- `plugins/sdd/hooks/guard.mjs` already parses commands into simple commands, unwraps `bash -c` and
  `eval`, and has the approvals group; this change widens that group.
- `plugins/sdd/hooks/test/guard.test.mjs` is table-driven; new shapes are rows.

## ADDED

## MODIFIED
### REQ-HOOK-1: Blocked shapes

| Group | Blocked |
|---|---|
| Push | `--force`, `-f`, `--force-with-lease`, `--force-if-includes`, `+<ref>` refspecs, `--delete`/`-d`, `:<ref>` deletion, `--mirror`, `--prune`, `--no-verify`; any compound command (`;`, `&&`, `\|\|`, `\|`, `$(`, backticks) containing a push |
| History | `commit --amend`; `rebase` when `git.integration: merge`; `filter-branch`; `filter-repo`; `reflog expire\|delete`; `update-ref -d` |
| Local destruction | `branch -D` / `--delete --force`; `reset --hard`; `clean -f…`; `checkout -- <path>` / `restore` without `--staged`; `worktree remove --force`; `stash drop\|clear` |
| Forge | `gh pr merge`; `gh pr review`; `--reviewer` / `--add-reviewer`; `gh pr ready` unless `pr.auto_ready`; `gh pr create` without `--draft` when `pr.draft`; `gh repo delete`; `gh api` with DELETE or a merge/review endpoint |
| Escape hatches | `git config` writes to `alias.*`, `push.*`, `receive.*`, `remote.*.push`, `url.*`, `core.hooksPath`; `commit --no-verify` |
| Mentions | `@handle` in `gh pr\|issue create\|comment\|edit` bodies and `--body-file` contents, outside inline or fenced code |
| Approvals | `sdd.mjs approve` from the Bash tool; any simple command whose text, including quoted arguments, inline code, heredoc bodies and write options, names a `state.yaml` under `docs/changes/`, unless its program only reads or stages (`cat`, `head`, `tail`, `less`, `more`, `grep`, `rg`, `wc`, `ls`, `stat`, `file`, `diff`, `echo` without redirect, `node <sdd.mjs> validate\|status\|context`, `git diff\|log\|show\|status\|add\|commit\|restore --staged`) |
| Autopilot mode only | Any git verb other than `fetch`, `worktree add\|list\|remove\|prune` and read-only verbs against the main checkout; writes to `.sdd/config.yaml`, `.sdd/rules.md`, `.sdd/constitution.md` |

Paths built at run time are not detected; this layer is a strong default, not a security boundary
(ADR-0003).
- AC-HOOK-1.1 Given each blocked shape in the fixture table (≥45 cases), When guard evaluates it,
  Then it exits 2 with the reason and the hand-off line.

## REMOVED

## Acceptance criteria
- AC-1 Given `node -e` code that appends to `docs/changes/c1/state.yaml`, When guard evaluates it, Then it blocks and names `/sdd:approve`.
- AC-2 Given `python3 -c` code that writes `docs/changes/c1/state.yaml`, When guard evaluates it, Then it blocks.
- AC-3 Given `ruby -e`, `dd of=` or `truncate` targeting `docs/changes/c1/state.yaml`, When guard evaluates each, Then each blocks.
- AC-4 Given `cat`, `grep`, `git diff`, `git add` or `git commit` naming that file, When guard evaluates each, Then each is allowed.
- AC-5 Given `echo "see docs/changes/c1/state.yaml"` without a redirect, When guard evaluates it, Then it is allowed.

## Open questions
