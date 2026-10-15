---
name: learn
description: Turns a mistake the agent made into a generic rule in .sdd/rules.md that every command reads.
disable-model-invocation: true
argument-hint: <what went wrong>
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context)
---

# Learn a rule

## Context (current rules included)
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context`

What went wrong, in the person's words: $ARGUMENTS

1. Ask at most two questions if the failure or its trigger is unclear.
2. Write one rule that is **generic**: no names, paths, hosts, ticket IDs, customers or domain
   details — describe the class of mistake, not the incident.
   ```
   ## R<next>: <imperative rule, one line>
   - Why: <the failure it prevents>
   - How to apply: <when it triggers and what to do instead>
   - Added: <yyyy-mm-dd>
   ```
3. If an existing rule has the same intent, propose amending it instead of adding a new one.
4. Suggest the strongest mechanism that could enforce it next time (a validator rule, a hook shape,
   a template change) as a follow-up, in one line.
5. Show the proposal and write `.sdd/rules.md` only after the person confirms. Then run
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" validate --all` and fix any V-RULES or V-LEAK finding.
