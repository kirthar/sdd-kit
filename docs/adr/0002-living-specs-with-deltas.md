# ADR-0002: Living specs with change deltas

Status: accepted · Cites: K1, K10

## Context
Specs written once per epic go stale the day after merge, and existing projects have no specs at
all. Agents then plan against an imagined system.

## Decision
- `docs/specs/<capability>.md` describes **current** behaviour, one file per capability, with
  stable requirement IDs (`REQ-<capability>-<n>`).
- `docs/changes/<id>/` holds a proposal in flight: `state.yaml`, and depending on the route
  `brief.md` (quick), `delta.md` (standard), `functional.md` + `technical.md` + `contracts/` (full),
  `tasks.md`, `test-plan.md`, `verification.md`. The phase is derived from artifacts and approvals.
- `delta.md` (standard) and `technical.md` § Living spec deltas (full) state the effect on living specs:
  `## ADDED`, `## MODIFIED` (full new text of each requirement), `## REMOVED` (ID + reason).
- `/sdd:archive` merges deltas into `docs/specs/` with a deterministic script after a human merge,
  then moves the change to `docs/changes/archive/<id>/` (the id already starts with the date). A MODIFIED or REMOVED target that
  does not exist fails the archive instead of being guessed.
- Adoption for existing projects: `/sdd:adopt` drafts living specs from code with
  `status: unverified`; a person flips each to `verified`. The validator reports unverified specs.
- Acceptance criteria (`AC-<n>`, Given/When/Then) live in the functional spec (or in the delta for
  `standard`); the technical spec references them, never restates them.

## Consequences
- Merge conflicts on `docs/specs/` happen at archive time, in one deterministic step.
- Requirement IDs are immutable; renames are REMOVED + ADDED.

## Rejected alternatives
- Spec per epic only: no source of truth for current behaviour.
- Agent rewrites living specs freely: unreviewable drift.
