# Example: bookings

A tiny project that went through all three routes using only files — no tracker, no wiki.
Everything here was produced with the `sdd` CLI and skills; open the folders in order.

| Route | Change | What to look at |
|---|---|---|
| quick | `docs/changes/archive/20261015-fix-confirmation-typo/` | `brief.md` (≤15 lines) and a short `pr.md`. **No spec**, no tasks. |
| standard | `docs/changes/archive/20261015-cancel-booking/` | `delta.md` adds `REQ-BOOK-3` and modifies `REQ-BOOK-1`; `tasks.md`, `test-plan.md`, `verification.md` |
| full | `docs/changes/archive/20261015-booking-reviews/` | `functional.md` → `technical.md` + `contracts/reviews.yaml` + `docs/adr/0001-…` → `tasks.md` |

After each merge, `/sdd:archive` folded the deltas into the living specs:
`docs/specs/bookings.md` now contains `REQ-BOOK-3`, and the new capability `docs/specs/reviews.md`
was created from the full change.

## The commands behind it

```text
/sdd:init                                   # config, constitution, rules, AGENTS.md
/sdd:new "the confirmation says bookng"     # proposes quick → person runs /sdd:approve <id> route
/sdd:implement                              # red → green → commit
/sdd:pr                                     # draft PR body
/sdd:archive <id>                           # after the person merges

/sdd:new "guests can cancel a booking"      # standard
/sdd:spec → /sdd:approve <id> spec → /sdd:tasks → /sdd:approve <id> tasks
/sdd:implement → /sdd:verify → /sdd:pr → /sdd:archive <id>

/sdd:new "guests can review a stay via a new API"   # full
/sdd:refine → /sdd:approve <id> functional → /sdd:spec → … (as standard)
```

Check it yourself from this folder:

```bash
npm test
node ../../plugins/sdd/scripts/sdd.mjs validate --all
```
