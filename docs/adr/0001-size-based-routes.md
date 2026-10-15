# ADR-0001: Size-based routes instead of one process

Status: accepted · Cites: K2, K3

## Context
A single spec-driven process turns a one-line bug fix into a multi-page document, so people skip
it. Skipping it for large changes is exactly when it is most needed.

## Decision
Three routes. `/sdd:new` proposes one with its reasons; the human confirms or overrides with
`/sdd:approve <id> route`.

| Route | When | Artifacts | Human stops |
|---|---|---|---|
| `quick` | Bug or small change, no contract or capability change | `brief.md` (≤15 lines), tests, short PR body | Route; merge |
| `standard` | Change to an existing capability | `delta.md`, `tasks.md` | Route; spec → tasks; tasks → implementation; merge |
| `full` | New capability or epic | `functional.md`, `technical.md`, OpenAPI contracts, ADR when a decision is made, `tasks.md` | Route; functional; spec → tasks; tasks → implementation; merge |

Proposal signals (any hit moves the route up, never down): new or changed public contract, new
capability, schema or data migration, security or authorization surface, more than one deployable
touched, more predicted files than `routes.quick_max_files`.

A route can be escalated mid-change (`quick` → `standard`); it is never silently downgraded.

## Consequences
- `quick` never creates `functional.md`, `delta.md`, `technical.md` or `contracts/` — enforced by the validator.
- Code writes need the route confirmation even for `quick` — enforced by the gate hook.
- Every template carries a size budget; the validator warns above it.

## Rejected alternatives
- One adaptive template with optional sections: the agent fills optional sections anyway.
- Size by line count only: misses small but risky contract and authorization changes.
