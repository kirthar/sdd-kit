# Brief: doctor never aborts the init skill

## Problem
`/sdd:init` injects `sdd doctor`, which exits 3 when a prerequisite is missing; Claude Code then aborts the whole skill with a raw shell error instead of the install guidance (`plugins/sdd/skills/init/SKILL.md`).

## Expected behaviour
The skill runs `sdd doctor --report`, which prints the same checks and always exits 0, so the skill explains what to install and stops. Plain `sdd doctor` keeps exit 3.

## Proving test
A CLI test runs `sdd doctor --report` outside a git work tree: exit 0 and a `FAIL worktree` line (command level).
