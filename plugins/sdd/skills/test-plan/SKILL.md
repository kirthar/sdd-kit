---
name: test-plan
description: Derives a test plan with one case per acceptance criterion, classified as automated, manual or developer-level. Use when asked for test cases or a test plan for a change.
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context)
---

# Test plan

## Context
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs" context`

## Steps
1. Read the criteria (functional.md for full, delta.md for standard). Quick changes: refuse, the
   brief's proving test is the plan.
2. Write `docs/changes/<id>/test-plan.md` (template `test-plan`): at least one case per criterion,
   columns Case · Criterion · Steps · Expected · Level (automated | manual | developer).
3. Add non-happy cases from `${CLAUDE_PLUGIN_ROOT}/references/edge-cases.md` where a criterion implies them.
4. Missing data or environment: write `BLOCKED — <what is missing>`; never invent values.

## Next
Summarise counts per level and any BLOCKED cases. When called after a GO verification, continue
without asking with `/sdd:pr`.
