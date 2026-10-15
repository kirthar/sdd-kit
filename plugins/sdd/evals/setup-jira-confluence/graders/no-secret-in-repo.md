---
type: 'regex'
pattern: '(token|password|api[_-]?key)\s*[:=]\s*\S{8,}'
flags: 'i'
match: 'not_contains'
target: 'files'
---
