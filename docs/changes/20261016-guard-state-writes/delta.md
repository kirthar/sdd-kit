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
Same table as before, with the Approvals row reading: `sdd.mjs approve` from the Bash tool; any simple
command whose text, including quoted arguments and inline code, names a `state.yaml` under
`docs/changes/`, unless its program is read-only or staging (`cat`, `head`, `tail`, `less`, `more`,
`grep`, `rg`, `wc`, `ls`, `stat`, `file`, `diff`, `echo` without redirect, `node <sdd.mjs> validate|status|context`,
and `git diff|log|show|status|add|commit|restore --staged`). Paths built at run time are not detected;
this layer is a strong default, not a security boundary (ADR-0003).
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
