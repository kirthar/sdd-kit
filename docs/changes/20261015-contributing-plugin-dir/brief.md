# Brief: load the plugin from another checkout when changing the kit

## Problem
Claude Code treats the files of the loaded plugin as sensitive, so a session started with `--plugin-dir ./plugins/sdd` cannot edit the kit it is running; `CONTRIBUTING.md` suggests exactly that.

## Expected behaviour
`CONTRIBUTING.md` says to work in a worktree and load the plugin from the main checkout (`--plugin-dir <main checkout>/plugins/sdd`).

## Proving test
A docs test asserts `CONTRIBUTING.md` no longer suggests `--plugin-dir ./plugins/sdd` and names the main-checkout form.
