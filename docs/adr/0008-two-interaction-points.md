# ADR-0008: Two interaction points, then an autonomous run to a ready pull request

Status: accepted · Cites: K3, K4

## Context
Every phase and every task ended with the agent stopping and offering to continue. A standard
change needed five or more prompts (route, spec, tasks, then one per task, verify, PR), each of
them a wait for a person who had already decided. The approvals themselves were not the cost; the
pauses between them were. Separately, agents added AI co-author trailers and "Generated with"
footers to commits and pull requests, crediting a tool for work a person answers for.

## Decision
- The person is asked at two moments: the route, and, for standard and full, one review of the
  whole plan. Every clarification question is asked before the plan is written.
- `/sdd:approve <id> plan` records every planning phase not yet approved (`functional` on full,
  `spec`, `tasks`) in one human act, after validating each artifact. Per-phase approvals still work.
- After an approval the agent continues with the next command in the same turn. After the last
  one it implements every task, verifies, writes the test plan and opens the pull request. It stops
  only on a refused approval, a BLOCKING question, a tripwire, an unfixable failing test, a NO-GO
  verification or a secret finding.
- `pr.auto_ready` defaults to `true`: the pull request opens as a draft and is marked ready for
  review once verification is GO. Merging, approving and requesting reviewers stay the person's.
- No AI attribution: `guard` blocks commits and `gh pr create|edit` whose text credits an AI
  assistant as co-author or carries a "Generated with" line naming one; `sdd validate` flags the
  same lines in open `pr.md` files (V-ATTRIBUTION). The author's own signature is allowed.

## Consequences
- K3 holds: every approval is still the person's own command; continuing to the next step is work,
  not a transition. Marking ready is not a merge or a review request.
- Planning artifacts are written before any of them is approved, so `sdd status` names the first
  missing artifact, then `/sdd:approve <id> plan`.
- Repositories that want the old behaviour set `pr.auto_ready: false`.

## Rejected alternatives
- One approval for everything, route included: the route decides which artifacts exist, so the
  person must confirm it before planning effort is spent.
- Keeping per-phase stops: the stops cost interactions without adding a decision.
- Blocking `-S` and `--signoff`: signing is the author's choice and says nothing about an AI tool.
