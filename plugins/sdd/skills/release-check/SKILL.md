---
name: release-check
description: Checks that every pull request linked to the changes in a release is merged and returns BLOCK, WARN or OK.
disable-model-invocation: true
argument-hint: [<from>..<to> | <change-id> ...]
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" release-check:*)
---

# Release check

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" release-check $ARGUMENTS`

Summarise the verdict above. For BLOCK, list each unmerged pull request first. For WARN, list what
could not be checked and how to check it by hand. This command is read-only: never comment on,
label, merge or transition anything.
