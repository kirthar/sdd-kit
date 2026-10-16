---
name: new
description: Starts a new change and proposes its route (quick, standard or full) from the size and risk of the request, creating docs/changes/<id>/. Use whenever someone asks to fix a bug, change behaviour or build a feature and no change is active yet, including small fixes such as typos.
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context)
---

# Start a change

## Context
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context`

Every code change goes through a change folder, even a one-line fix: the gate hook blocks code
edits until the person confirms the route. Keep this step fast for small fixes.

## Steps
1. If an active change already covers this request, stop and continue it instead (see Context).
2. Read just enough code to size the request (search, do not edit).
3. Pick the route. Any signal moves the route up, never down:
   | Signal | Minimum route |
   |---|---|
   | new or changed public contract (API, event, schema others consume) | full |
   | new capability (nothing in `docs/specs/` or the code does this yet) | full |
   | schema or data migration · security or authorisation surface · more than one deployable | standard |
   | more predicted files than `routes.quick_max_files` · changes documented behaviour | standard |
   | none of the above (bug, typo, small internal change) | quick |
4. Create the change (slug = 2–5 words, kebab-case; capabilities = affected living specs):
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" new <slug> --route <route> --capabilities <cap,...> --signals <signal,...>`
   On `base_branch` this first creates and switches to `sdd/<id>`; on any other branch it stays
   there. If `sdd/<id>` exists or the switch fails (for example a dirty tree) it creates nothing:
   report why and stop.
5. For **quick**, fill `brief.md` (≤15 lines): Problem (link the code), Expected behaviour,
   Proving test (behaviour and layer). Write nothing else — no spec, no tasks.
6. Reply with: the route, the signals that fired (or "none"), and ask the person to confirm with
   `/sdd:approve <id> route` — or `/sdd:approve <id> route route=<other>` to override.

## Stop
Do not edit code, tests or other files, and do not record approvals yourself. End the turn after
asking for the confirmation.
