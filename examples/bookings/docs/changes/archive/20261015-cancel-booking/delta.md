# Delta: cancel a booking

## Why
Guests who can no longer travel need to cancel; today a booking stays confirmed forever.

## Reuse
- `src/bookings.js` already owns booking storage and status (constitution C1); extend it.

## ADDED
### REQ-BOOK-3: Cancel a booking
A confirmed booking can be cancelled by its id; its status becomes cancelled. Cancelling an
unknown id fails with "not found".

## MODIFIED
### REQ-BOOK-1: Create a booking
A booking needs at least one night and starts as confirmed. Confirmed is one of two statuses:
confirmed and cancelled.

## REMOVED

## Acceptance criteria
- AC-1 Given a confirmed booking, When the guest cancels it, Then reading it shows status cancelled.
- AC-2 Given an unknown booking id, When the guest cancels it, Then an error says it was not found.

## Open questions
