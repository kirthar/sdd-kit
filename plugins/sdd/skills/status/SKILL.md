---
name: status
description: Shows open changes with their route, current phase, missing approvals and the next command. Use when asked what is in progress, what is pending or what to do next.
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context), Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" status)
---

# Status

## Context
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context`

## Open changes
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" status`

Summarise the open changes above for the person: for each, the route, phase, missing approvals
and the exact next command (approvals are commands the person runs). Read-only: change nothing.
