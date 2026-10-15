# Verification: cancel a booking

## Commands run
- `npm run lint` — ok
- `npm test` — 4 passed, 0 failed

## Criterion evidence
| Criterion | Evidence (test, run, observation) | Result |
|---|---|---|
| AC-1 | `test/bookings.test.js` › "AC-1: cancelling a confirmed booking marks it cancelled" | pass |
| AC-2 | `test/bookings.test.js` › "AC-2: cancelling an unknown booking says it was not found" | pass |

## Not verified locally
Nothing beyond the unit suite; no other environments exist in this example.

## Verdict
GO
