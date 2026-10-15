---
type: 'regex'
pattern: '## Reuse[\s\S]*bookings\.js'
flags: 's'
match: 'contains'
target: {source: "file", path: "docs/changes/20260101-cancel-booking/delta.md"}
---
