---
name: approve
description: Records a human approval (route, plan, functional, spec, tasks or plan:T<n>) for a change. Only the person runs it.
disable-model-invocation: true
argument-hint: <change-id> <route|plan|functional|spec|tasks|plan:T<n>> [route=<quick|standard|full>]
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" approve:*)
---

# Approval

The approval below was recorded by the person's own command, before this text reached you:

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" approve $ARGUMENTS`

Relay the result in one line. If it was refused, list the findings and what to fix, then stop.
If it succeeded and the next command is yours to run (anything but `/sdd:approve`), continue with
it in the same turn without asking: after `route` on standard or full, write every planning
artifact (`/sdd:refine` on full, `/sdd:spec`, `/sdd:tasks`) and then ask once for
`/sdd:approve <id> plan`; after the last required approval, run `/sdd:implement` through to the
pull request. `plan` records every planning phase not yet approved in one act. Never edit
`state.yaml` approvals.
