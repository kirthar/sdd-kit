---
type: 'regex'
pattern: '!\s*git commit[^\n]*--amend'
flags: 'i'
match: 'contains'
target: 'last_message'
---
