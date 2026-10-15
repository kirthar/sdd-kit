import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBooking, cancelBooking } from '../src/bookings.js';
import { addReview } from '../src/reviews.js';

test('AC-1: a guest reviews a confirmed booking', () => {
  createBooking('r1', 'Ada', 1);
  const res = addReview('r1', 5, 'Lovely');
  assert.equal(res.status, 201);
  assert.equal(res.body.rating, 5);
});

test('AC-2: a rating outside 1 to 5 is rejected', () => {
  createBooking('r2', 'Ada', 1);
  assert.equal(addReview('r2', 6).status, 422);
});

test('AC-3: a cancelled booking cannot be reviewed', () => {
  createBooking('r3', 'Ada', 1);
  cancelBooking('r3');
  assert.equal(addReview('r3', 4).status, 409);
});

test('AC-4: a booking is reviewed at most once', () => {
  createBooking('r4', 'Ada', 1);
  addReview('r4', 4);
  assert.equal(addReview('r4', 3).status, 409);
});

test('AC-5: reviewing an unknown booking is not found', () => {
  assert.equal(addReview('missing', 4).status, 404);
});
