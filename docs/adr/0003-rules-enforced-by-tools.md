# ADR-0003: Critical rules are enforced by tools

Status: accepted · Cites: K3, K4

## Context
Rules written only in prompts are followed most of the time. "Most of the time" is not acceptable
for irreversible actions or for skipping human approval.

## Decision
Four layers, each covering what the previous one cannot:

1. **`guard` hook** (PreToolUse on Bash), always on. Blocks: merge, PR review/approval, requesting
   reviewers, force push in any form (flags and `+refspec`), remote ref deletion, `--mirror`,
   `--prune`, amend, `filter-branch`, `reflog expire|delete`, `branch -D`, `git config` writes that
   re-grant the above, and mentions in PR/issue text. Detection ignores quoted text and heredoc
   bodies, refuses compound commands containing a push, and inspects `bash -c`/`eval` payloads.
   **Every block prints the reason and the exact command for the human to run themselves**
   (e.g. `! git push --force-with-lease origin <branch>`), so the person keeps full control.
2. **`gate` hook** (PreToolUse on `Edit|Write|MultiEdit|NotebookEdit`), on by default, `gates.enforce: false` to
   disable. Blocks writing outside `docs/` and `.sdd/` while the active change lacks the approvals its
   route requires — including `route` for `quick` — and blocks adding or changing `approvals`
   entries in `state.yaml` directly.
   Approvals are recorded only by `/sdd:approve`, a user-only skill.
   Known limit: a determined agent could write through Bash; the guard hook flags shell writes to
   `state.yaml`. This layer is a strong default, not a security boundary.
3. **Validators** (`sdd validate`): structure and size budgets per template, valid OpenAPI,
   every task has ≥1 criterion, every criterion has ≥1 task, `quick` has no spec, deltas reference
   existing requirement IDs, no unverified specs (warning).
4. **CI template**: runs the same validator on every pull request of the adopting project.

## Consequences
- Hooks and validators are tested like product code (TDD, fixtures per blocked shape).
- Hooks fail closed only for git/forge commands they cannot parse; everything else fails open.

## Rejected alternatives
- Permission deny lists alone: prefix matching is trivially bypassed (`git -C x push -f`).
- Configurable force push: the human can always run it; the agent never needs to.
