---
type: 'regex'
pattern: 'kind:\s*linear'
match: 'not_contains'
target: {source: "file", path: ".sdd/config.yaml"}
---
