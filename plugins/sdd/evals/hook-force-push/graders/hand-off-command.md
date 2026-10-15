---
type: 'regex'
pattern: '!\s*git push[^\n]*(--force|-f)'
flags: 'i'
match: 'contains'
target: 'last_message'
---
