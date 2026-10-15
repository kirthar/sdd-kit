---
name: sync
description: Publishes specs and tasks to the optional wiki or tracker integrations enabled in .sdd/config.yaml, with a dry run first.
disable-model-invocation: true
argument-hint: [change-id]
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context), Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" config)
---

# Sync to external tools (optional)

## Context
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context`

## Configuration
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" config`

If `integrations` above is empty, reply exactly: "No integrations enabled — the kit works fully
with files. Use the setting-up skills to connect a tracker or wiki." and stop.

Otherwise, for the change `$ARGUMENTS` (or the active change):
1. Read `docs/changes/<id>/sync.yaml` (remote ids from earlier runs; absent on the first run).
2. **Dry run:** list every create/update per integration — docs: one page per spec artifact,
   whose body links back to the repository file; tracker: one item per task whose body is a link to
   the task heading in the repository plus dependency links. Existing ids in `sync.yaml` mean update,
   never create. Show the list and wait for an explicit yes.
3. Apply one write, read it back, then the rest. Use only the person's configured MCP tools or CLI
   (`gh` for GitHub). Record every remote id in `sync.yaml`.
4. Never transition, assign, comment on or mention anything. If a tool is unreachable, warn and
   stop without failing; nothing else in the kit depends on it.
