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
3. **Quick:** confirm the proving test from `brief.md` exists and that the tdd log
   (`node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" status --json` / commit history) shows it failing before it passed. Report in the
   terminal only — write no file.
4. **Standard / full:** for every criterion find exercised evidence — a test that asserts it and
   passed, or an observation you made by running the software. Reading the code is not evidence.
   Write `docs/changes/<id>/verification.md` (template `verification`): commands, criterion →
   evidence table, what was not verified locally, verdict.
5. Verdict: **GO** only when every criterion has evidence, validators pass and tests are green;
   otherwise **NO-GO** naming each gap.

## Stop
Report the verdict. On GO suggest `/sdd:pr`; on NO-GO list what is missing.
