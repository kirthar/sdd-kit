---
name: archive
description: Merges the spec deltas of a merged change into docs/specs and archives the change folder.
disable-model-invocation: true
argument-hint: <change-id>
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context)
---

# Archive a merged change

## Context
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context`

1. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" archive $ARGUMENTS`.
2. If it reports that merge state cannot be checked, ask the person whether every pull request of
   the change is merged. Only after an explicit yes, re-run with `--merged-confirmed`.
3. On failure, show the findings (for example a MODIFIED requirement that does not exist) and stop;
   never edit `docs/specs/` by hand to force it through.
4. On success, show `git diff --stat docs/specs` and suggest committing
   `docs: archive <id> and update living specs`.
