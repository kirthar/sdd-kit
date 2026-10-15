---
name: spec
description: Writes the technical spec for a standard or full change after researching reusable code - a delta against living specs, or a technical design with OpenAPI contracts and ADRs. Use when a confirmed change needs its design or spec written.
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context)
---

# Spec (standard and full)

## Context
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context`

Refuse on quick changes (no spec for quick). On full, require the `functional` approval first
and name `/sdd:approve <id> functional` if it is missing.

## Steps
1. **Research first (mandatory).** Delegate to the `sdd-researcher` agent with the change id and
   request. Use its findings: reuse candidates, duplicates, affected capabilities, risks.
2. **Standard** → write `docs/changes/<id>/delta.md` (template `delta`, ≤120 lines):
   - `## Reuse`: what exists, with file links.
   - `## ADDED` / `## MODIFIED` / `## REMOVED` against `docs/specs/<capability>.md`:
     `### REQ-<CAP>-<n>: <title>` + full text. New IDs for ADDED; existing IDs for MODIFIED;
     `- REQ-…: <reason>` for REMOVED.
   - `## Acceptance criteria`: `- AC-<n> Given …, When …, Then ….`
     (`${CLAUDE_PLUGIN_ROOT}/references/requirements-principles.md`).
3. **Full** → write `docs/changes/<id>/technical.md` (template `technical`, ≤250 lines),
   `contracts/*.yaml` (OpenAPI 3.x, the single source of truth — never paraphrase it), the
   `## Living spec deltas` section, and one ADR in `docs/adr/` per decision with a rejected
   alternative (template `adr`). Reference criteria from `functional.md` by ID; do not restate them.
4. Sweep `${CLAUDE_PLUGIN_ROOT}/references/clarification-angles.md`; record open items as BLOCKING or NON-BLOCKING.
5. Delegate to `sdd-spec-reviewer`; fix its BLOCKING findings.
6. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" validate <id>` until there are no errors.

Templates: `.sdd/templates/<name>.md` wins over `${CLAUDE_PLUGIN_ROOT}/templates/<name>.md`.
Link to code instead of copying it. Migration and Observability always present ("None." is fine).

## Stop
Ask the person to review and run `/sdd:approve <id> spec`. Do not write tasks or code.
