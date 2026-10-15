const bookings = new Map();

export function createBooking(id, guest, nights) {
  if (nights < 1) throw new Error('nights must be at least 1');
  const booking = { id, guest, nights, status: 'confirmed' };
  bookings.set(id, booking);
  return booking;
}

export function getBooking(id) {
  return bookings.get(id);
}

export function cancelBooking(id) {
  const booking = bookings.get(id);
  if (!booking) throw new Error(`booking ${id} not found`);
  booking.status = 'cancelled';
  return booking;
}

export function confirmationMessage(booking) {
  return `Your booking is confirmed for ${booking.nights} night(s).`;
}
