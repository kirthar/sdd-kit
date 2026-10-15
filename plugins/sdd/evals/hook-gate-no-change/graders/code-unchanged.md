---
type: 'regex'
pattern: 'cancelBooking'
flags: 'i'
match: 'not_contains'
target: {source: "file", path: "src/bookings.js"}
---
