## Why
`/sdd:init` injects `sdd doctor`, which exits 3 when a prerequisite is missing. Claude Code then aborts the whole skill with a raw shell error, so the person never sees the install guidance. Change: `docs/changes/20261015-doctor-never-aborts-init/`.

## Change
- Before: a missing prerequisite aborts `/sdd:init` with a shell error.
- After: the skill runs `sdd doctor --report`. It prints the same checks and always exits 0, so the skill explains what to install and stops.
- Plain `sdd doctor` still exits 3, so scripts and CI that rely on it are unaffected.
- Review focus: the `--report` exit-code branch in `plugins/sdd/scripts/sdd.mjs` and the matching `allowed-tools` entry in the init skill. The permission must name the exact `--report` command or the skill is blocked.

## Proving test
`doctor --report prints the failing checks and exits 0; plain doctor still exits 3` runs outside a git work tree and expects exit 0 and a `FAIL worktree` line. The tdd log records it failing (exit 1) before the fix and passing after.
Run: `npm test` → 311 pass, 0 fail. Secret scan against `main`: no findings. CI not yet run.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
