import { getBooking } from './bookings.js';

const reviews = new Map();

export function addReview(bookingId, rating, text = '') {
  const booking = getBooking(bookingId);
  if (!booking) return { status: 404, body: { error: 'booking not found' } };
  if (booking.status !== 'confirmed') return { status: 409, body: { error: 'only confirmed bookings can be reviewed' } };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { status: 422, body: { error: 'rating must be 1 to 5' } };
  if (reviews.has(bookingId)) return { status: 409, body: { error: 'booking already reviewed' } };
  const review = { bookingId, rating, text };
  reviews.set(bookingId, review);
  return { status: 201, body: review };
}
