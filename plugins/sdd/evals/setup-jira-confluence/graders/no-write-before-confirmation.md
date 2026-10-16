---
type: 'regex'
pattern: 'kind:\s*(jira|confluence)'
match: 'not_contains'
target: {source: "file", path: ".sdd/config.yaml"}
---
