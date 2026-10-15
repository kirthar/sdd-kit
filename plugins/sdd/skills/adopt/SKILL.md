---
name: adopt
description: Drafts living specs from existing code for a person to verify, so an existing project can adopt spec-driven development.
disable-model-invocation: true
argument-hint: [area or capability]
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context)
---

# Adopt: draft living specs from code

## Context
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context`

Scope: $ARGUMENTS (whole repository if empty — then propose a capability list first and ask
which to draft; at most 3 per run).

1. Delegate to `sdd-researcher`: identify capabilities in scope and, for each, the observable
   behaviour with the files that implement it.
2. For each capability write `docs/specs/<capability>.md` from the `living-spec` template with
   `status: unverified` in the frontmatter. One `### REQ-<CAP>-<n>: <title>` per behaviour, each
   followed by its text and `Source: <file links>`. Describe what the code does today, including
   odd behaviour; do not describe what it should do.
3. Never overwrite an existing living spec; propose a delta instead.
4. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" validate --specs`.
5. Tell the person: every drafted spec must be reviewed and switched to `status: verified` by them.
