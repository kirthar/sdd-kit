# Tasks: booking reviews

## T1: Store a review for a confirmed booking
- Covers: AC-1, AC-5
- Expected paths: src/reviews.js, test/reviews.test.js
- Outermost test: posting a review through the reviews module at module level
- Depends on: none
- Package: .
- Status: done

## T2: Reject invalid and duplicate reviews
- Covers: AC-2, AC-3, AC-4
- Expected paths: src/reviews.js, test/reviews.test.js
- Outermost test: rejected reviews through the reviews module at module level
- Depends on: T1
- Package: .
- Status: done
