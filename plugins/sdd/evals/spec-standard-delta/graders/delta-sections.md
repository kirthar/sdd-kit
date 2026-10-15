---
type: 'regex'
pattern: '## ADDED[\s\S]*## MODIFIED[\s\S]*## REMOVED'
flags: 's'
match: 'contains'
target: {source: "file", path: "docs/changes/20260101-cancel-booking/delta.md"}
---
