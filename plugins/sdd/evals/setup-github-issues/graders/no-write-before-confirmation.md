---
type: 'regex'
pattern: 'kind:\s*github'
match: 'not_contains'
target: {source: "file", path: ".sdd/config.yaml"}
---
