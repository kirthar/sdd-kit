---
name: verify
description: Checks the Definition of Done for the active change - validators, configured lint and tests, and an acceptance-criterion-to-evidence matrix with a GO or NO-GO verdict. Use when asked whether a change is done, ready or verified.
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context)
---

# Verify

## Context
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context`

## Steps
1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" validate <id>`.
2. Run the configured lint and test commands; record the exact commands and results.
3. **Quick:** confirm the proving test from `brief.md` exists, then read the recorded runs with
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" tdd log <id>`. A red run followed by a green run
   means the proving test is **proven**. No red run (or no runs) is **NO-GO**: name the missing red
   run. Report in the terminal only — write no file.
4. **Standard / full:** for every criterion find exercised evidence — a test that asserts it and
   passed, or an observation you made by running the software. Reading the code is not evidence.
   Write `docs/changes/<id>/verification.md` (template `verification`): commands, criterion →
   evidence table, what was not verified locally, verdict.
5. Verdict: **GO** only when every criterion has evidence, validators pass and tests are green;
   otherwise **NO-GO** naming each gap.

## Next
Report the verdict. On GO continue without asking: standard and full → `/sdd:test-plan`, then
`/sdd:pr`; quick → `/sdd:pr`. On NO-GO list what is missing and stop.
