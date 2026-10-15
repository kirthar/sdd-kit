## Why
Guests had no way to review a stay (`functional.md` in the change folder).

## Behaviour change
New `addReview(bookingId, rating, text)` returning the statuses in `contracts/reviews.yaml`.

## Review focus
RULE-1 check order, and that reviews never change booking status (constitution C1, ADR-0001).

## Criteria
Covered: AC-1 to AC-5. Out of scope: editing, deleting and showing reviews (product).

## Evidence
`npm test` — 9 passed; each criterion's test was red before its code existed.

## To confirm
- [ ] Product: 2000-character limit on review text.
