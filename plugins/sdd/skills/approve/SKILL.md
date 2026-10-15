---
name: approve
description: Records a human approval (route, functional, spec, tasks or plan:T<n>) for a change. Only the person runs it.
disable-model-invocation: true
argument-hint: <change-id> <route|functional|spec|tasks|plan:T<n>> [route=<quick|standard|full>]
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" approve:*)
---

# Approval

The approval below was recorded by the person's own command, before this text reached you:

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" approve $ARGUMENTS`

Relay the result in one or two lines. If it was refused, list the findings and what to fix.
If it succeeded, state the next command and, when that command is yours to run (for example
`/sdd:tasks` or `/sdd:implement`), offer to continue. Never edit `state.yaml` approvals.
