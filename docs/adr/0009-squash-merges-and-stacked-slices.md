# ADR-0009: Semantic squash merges and stacked slices under a size budget

Status: accepted · Cites: K2, K3, K4, K5

## Context
Merge commits read "Merge pull request #11 from owner/branch": the base branch history named
branches, not behaviour. And a large change reached review as one large pull request; review
quality drops sharply past a few hundred changed lines, so large pull requests were skimmed.

## Decision
- `pr.merge` (default `squash`): one commit per pull request on the base branch. `sdd
  forge-settings` prints the repository settings that take that commit's subject from the pull
  request title and its message from the body, allow only that method, and delete branches on
  merge; `/sdd:init` offers them and applies them with `gh` after confirmation.
- `guard` requires pull request titles in the configured `commit.format`, so the squash subject is
  semantic by construction.
- `pr.max_lines` (default 400) is the review budget, measured by `sdd size` over source lines
  (`pr.size_exclude` skips docs, tests, lockfiles and vendored code).
- Over budget, `/sdd:tasks` groups tasks into slices (`Slice: S<n>`, checked by V-SLICE). Each
  slice is one pull request stacked on the slice below (`sdd/<id>-s<k>`), implemented, verified
  and marked ready in order without prompts. After a lower slice merges, `/sdd:pr` merges the base
  branch into the next slice and retargets it.
- A slice that cannot shrink below the budget is allowed; its body explains why in `## Size`.

## Consequences
- The rule "never stack on unfinished work" now reads "stack only slices of the same change":
  each slice is still releasable on its own, and the stack is merged bottom-up by the person.
- K3 holds: merging stays the person's; the agent only restacks.
- K5 holds: `forge-settings` and restacking degrade to printed commands without `gh`.

## Rejected alternatives
- Sequential slices against the base branch: the agent would wait for each merge, breaking the
  autonomous run.
- A size budget with warnings only: large changes would still reach review as one pull request.
- Keeping merge commits with a prepared `gh pr merge --subject` command: one more manual step on
  every merge, and easy to forget.
