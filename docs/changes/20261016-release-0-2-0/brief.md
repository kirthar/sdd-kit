# Brief: prepare the 0.2.0 release

## Problem
The changes opened on 2026-10-15 and 2026-10-16 are not in `CHANGELOG.md`, the plugin is still 0.1.0, and `docs/evals.md` reports development-time rows (stub skills) as if they were current.

## Expected behaviour
`CHANGELOG.md` has a 0.2.0 section, `plugin.json` and `marketplace.json` say 0.2.0, and `docs/evals.md` shows the 0.2.0 run first with older measurements under a clearly marked history.

## Proving test
`sdd validate --all` and `claude plugin validate --strict` pass, and a docs test checks that versions match the changelog.
