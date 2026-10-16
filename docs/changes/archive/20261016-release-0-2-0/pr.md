## Why
Prepare 0.2.0: the changes since 0.1.0 were not in the changelog, the plugin still said 0.1.0, and
`docs/evals.md` showed development-time rows as current. Merge last, after the other open changes.

## Change
`CHANGELOG.md` gains a 0.2.0 section; `plugin.json` and the marketplace entry say 0.2.0;
`docs/evals.md` leads with the 0.2.0 run (0.917 with the plugin, 0.353 without, 20 cases × 3 runs) and
moves older measurements to a marked history. No tag or release is created here.

## Proving test
`release.test.mjs` checks that plugin, marketplace and changelog agree on 0.2.0; it failed before the
bump and passes after. `sdd validate --all` and `claude plugin validate --strict` pass.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
