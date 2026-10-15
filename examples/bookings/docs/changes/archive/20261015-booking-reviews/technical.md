# Technical spec: booking reviews

## Reuse
- `getBooking` in `src/bookings.js` gives the booking and its status; no new booking access.

## Contracts
- `contracts/reviews.yaml` — `POST /bookings/{bookingId}/review` (additive).

## Rules
- RULE-1: check order is not found (404) → not confirmed (409) → invalid rating (422) → already reviewed (409), so one request gets one deterministic answer.

## Decisions
- Reviews live in their own module — rejected: a field on the booking. See `docs/adr/0001-store-reviews-separately.md`.

## Migration
None.

## Observability
None in this example; a real service would count 201 and 4xx responses per code.

## Living spec deltas
### ADDED
### REQ-REV-1: Review a confirmed booking
A guest leaves one rating from 1 to 5 with optional text for a confirmed booking.

### REQ-REV-2: Reject invalid reviews
Unknown bookings are not found; cancelled or already-reviewed bookings conflict; ratings outside
1 to 5 are rejected.

### MODIFIED
### REMOVED

## Open questions
