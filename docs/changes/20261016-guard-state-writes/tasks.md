# Tasks: guard blocks every shell write to change state

## T1: Block every command that names a change state file unless it only reads
- Covers: AC-HOOK-1.1, AC-1, AC-2, AC-3, AC-4, AC-5
- Expected paths: plugins/sdd/hooks/guard.mjs, plugins/sdd/hooks/test/guard.test.mjs
- Outermost test: guard evaluate on each command shape at hook level
- Depends on: none
- Package: .
- Status: todo
