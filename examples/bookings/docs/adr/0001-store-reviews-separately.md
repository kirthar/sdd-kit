---
template: adr
---
# ADR-0001: Store reviews outside the booking record

Status: accepted · Change: booking-reviews

## Context
Reviews need their own lifecycle (one per booking, later moderation) while bookings stay the
only owner of booking status (constitution C1).

## Decision
Keep reviews in their own module keyed by booking id; read bookings through `getBooking`.

## Consequences
Bookings stay unchanged; the one-review rule lives in one place (`src/reviews.js`).

## Rejected alternatives
- A `review` field on the booking: couples two lifecycles and lets booking code change reviews.
