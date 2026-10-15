---
name: refine
description: Writes the functional spec for a full-route change - clarification questions, scope, out of scope and Given/When/Then acceptance criteria. Use when a new capability or epic needs refining before technical design.
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context)
---

# Functional spec (full route)

## Context
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context`

Refuse for quick and standard changes: name `/sdd:implement` (quick) or `/sdd:spec` (standard).

## Steps
- [ ] Read the request, related living specs in `docs/specs/`, and the relevant code.
- [ ] Run the clarification sweep in `${CLAUDE_PLUGIN_ROOT}/references/clarification-angles.md`.
      Ask at most 4 questions per batch, each with options and a recommendation; wait for answers.
- [ ] Write `docs/changes/<id>/functional.md` from the template
      (`.sdd/templates/functional.md` if present, else `${CLAUDE_PLUGIN_ROOT}/templates/functional.md`).
      Keep it ≤120 lines. Criteria follow `${CLAUDE_PLUGIN_ROOT}/references/requirements-principles.md`;
      use `${CLAUDE_PLUGIN_ROOT}/references/edge-cases.md` to find non-happy paths.
- [ ] Put unresolved items under `## Open questions` as BLOCKING or NON-BLOCKING.
- [ ] Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" validate <id>` and fix every error.
- [ ] Self-check: every criterion is testable, atomic and has one outcome; out of scope is explicit.

## Stop
If a BLOCKING question is open, say so and stop. Otherwise ask the person to review and run
`/sdd:approve <id> functional`. Never record the approval yourself.
