## Why
Archiving the eight changes merged for 0.2.0 corrupted living specs: `sdd archive` rewrote specs that
had no delta, dropped inline `<!-- -->` text, and read `## ` lines inside fenced code as headings. Two
open deltas also used "unchanged" shortcuts in MODIFIED requirements, which would have deleted 13
criteria and a table on archive, and `sdd validate` accepted them.

## Change
- `archive` writes only specs that receive a delta; fenced code and inline comments stay byte for byte.
- `sdd validate` (V-DELTA) rejects a MODIFIED requirement that drops a criterion the living spec has;
  criteria carried over unchanged need no task (V-TRACE).
- The open deltas of `20261015-branch-per-change` and `20261016-guard-state-writes` now carry the full
  requirement text; the spec skill and delta templates say so explicitly.
- A trial archive of all eight changes on this branch drops nothing and validates.

## Proving test
Four tests, each red before the code (tdd log): archive leaves other specs untouched with fences and
inline comments; fenced headings survive a MODIFIED block; V-DELTA flags a dropped criterion;
unchanged carried criteria need no task. `npm test`: 395 passed.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
