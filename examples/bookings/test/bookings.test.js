import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBooking, getBooking, cancelBooking, confirmationMessage } from '../src/bookings.js';

test('creates and reads a booking', () => {
  createBooking('b1', 'Ada', 2);
  assert.equal(getBooking('b1').status, 'confirmed');
});

test('confirmation message is spelled correctly', () => {
  assert.equal(confirmationMessage({ nights: 2 }), 'Your booking is confirmed for 2 night(s).');
});

test('AC-1: cancelling a confirmed booking marks it cancelled', () => {
  createBooking('b2', 'Grace', 1);
  assert.equal(cancelBooking('b2').status, 'cancelled');
  assert.equal(getBooking('b2').status, 'cancelled');
});

test('AC-2: cancelling an unknown booking says it was not found', () => {
  assert.throws(() => cancelBooking('nope'), /not found/);
});
