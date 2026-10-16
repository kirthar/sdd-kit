## Why
Claude Code treats the files of the loaded plugin as sensitive, so a session started with `--plugin-dir ./plugins/sdd` cannot edit the kit it is running. `CONTRIBUTING.md` told contributors to do exactly that. Change: `docs/changes/20261015-contributing-plugin-dir/` (quick).

## Change
Before: `CONTRIBUTING.md` suggested `claude --plugin-dir ./plugins/sdd` from the checkout being edited.
After: it explains the limitation and says to work in a git worktree and load the plugin from the main checkout: `claude --plugin-dir <main checkout>/plugins/sdd`. Docs only; no plugin behaviour changes.

## Proving test
`plugins/sdd/scripts/test/contributing.test.mjs` asserts the old form is gone and the main-checkout form is named. `main` has the old form and lacks the new one, so it fails there; test and fix share one commit, so no red run is recorded.
- `node --test plugins/sdd/scripts/test/contributing.test.mjs`: 1 pass, 0 fail
- `sdd scan --diff main`: no secrets found
- Not run: the full test suite and `sdd validate --all`. CI confirms them.
