# Brief: fix the confirmation typo

## Problem
`confirmationMessage` in `src/bookings.js` says "bookng".

## Expected behaviour
The message reads "Your booking is confirmed for N night(s)."

## Proving test
A unit test on `confirmationMessage` asserts the exact text (module level).
