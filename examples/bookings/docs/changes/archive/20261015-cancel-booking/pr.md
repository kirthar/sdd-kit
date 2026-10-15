## Why
Guests could not cancel a booking they no longer need (`docs/changes/<id>/delta.md`).

## Behaviour change
Before: bookings stayed confirmed forever. After: `cancelBooking(id)` sets the status to cancelled
and fails with "not found" for unknown ids.

## Review focus
Status handling stays inside `src/bookings.js` (constitution C1).

## Criteria
Covered: AC-1, AC-2. Out of scope: refunds (product).

## Evidence
`npm test` — 4 passed. Red runs recorded before each green.

## To confirm
- [ ] Product: cancelling twice is a silent no-op.
