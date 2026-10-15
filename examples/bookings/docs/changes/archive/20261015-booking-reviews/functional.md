# Functional spec: booking reviews

## Problem
Guests cannot say how their stay went, and future guests have nothing to go on when booking.

## Scope
- A guest leaves one rating (1–5) with optional text for a confirmed booking.
- The review is returned to the caller once stored.

## Out of scope
- Editing or deleting a review.
- Showing reviews to other guests (a later change).
- Moderation of review text.

## Acceptance criteria
- AC-1 Given a confirmed booking, When the guest submits rating 5 with text, Then the response is 201 with the stored review.
- AC-2 Given a confirmed booking, When the guest submits rating 6, Then the response is 422 and nothing is stored.
- AC-3 Given a cancelled booking, When the guest submits a review, Then the response is 409.
- AC-4 Given a booking that already has a review, When the guest submits another, Then the response is 409 and the first review is unchanged.
- AC-5 Given an unknown booking id, When the guest submits a review, Then the response is 404.

## Open questions
