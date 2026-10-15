---
status: verified
---
# Bookings

## Purpose
Guests create and read their bookings.

## Requirements

### REQ-BOOK-1: Create a booking
A booking needs at least one night and starts as confirmed. Confirmed is one of two statuses:
confirmed and cancelled.

### REQ-BOOK-2: Read a booking
A booking can be read by its id.

### REQ-BOOK-3: Cancel a booking
A confirmed booking can be cancelled by its id; its status becomes cancelled. Cancelling an
unknown id fails with "not found".

## History
