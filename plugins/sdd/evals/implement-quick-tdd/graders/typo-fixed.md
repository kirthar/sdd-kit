---
type: 'regex'
pattern: 'Your booking is confirmed'
flags: 'i'
match: 'contains'
target: {source: "file", path: "src/bookings.js"}
---
