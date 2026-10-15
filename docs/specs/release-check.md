# Spec: release check

Status: current · Cites: K1, K3, K5 · ADRs: 0005

## Purpose
Stop a release when a change looks done but one of its pull requests is not merged.

## Requirements

### REQ-REL-1: Scope
`/sdd:release-check [<range>|<id>…]` (user-only). Default range: latest tag
to `HEAD`. Changes in scope: folders added or archived in the range, plus listed IDs.
- AC-REL-1.1 Given two changes archived since the last tag, When run without arguments, Then both
  are checked.

### REQ-REL-2: Check
Every PR URL in each `state.yaml` is queried with
`gh pr view --json state,mergedAt,baseRefName`.

### REQ-REL-3: Verdict and exit codes
BLOCK (exit 1) if any PR is open or closed without merge;
WARN (exit 0) for a change with tasks but no PR, a PR merged into a base other than
`release.branch`, or a PR that could not be checked; OK (exit 0) otherwise.
- AC-REL-3.1 Given a change with two PRs, one open, When checked, Then BLOCK names the open PR.
- AC-REL-3.2 Given `pr.forge: none` or `gh` unavailable, When checked, Then every PR is "not
  checked", the verdict is WARN, and manual steps are printed.

### REQ-REL-4: Read only
Read-only. Never comments, labels, transitions or merges.
- AC-REL-4.1 Given any run, When the trace is inspected, Then only `gh pr view` forge calls appear.

## History
