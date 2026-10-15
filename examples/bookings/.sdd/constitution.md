---
template: constitution
---
# Constitution

## Invariants
| ID | Invariant | Violated when | Evidence |
|---|---|---|---|
| C1 | Bookings are the only source of booking status | Another module stores or changes a booking's status | `src/bookings.js` |
| C2 | Reviews belong to exactly one confirmed booking | A review exists for a missing, cancelled or already-reviewed booking | `src/reviews.js` |
| C3 | Public responses use explicit status codes | A handler returns an error without a status | `docs/specs/reviews.md` |
| C4 | Every behaviour has a test that failed before it | Code lands without a test proving it | `test/` |
