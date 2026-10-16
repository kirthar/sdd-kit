---
template: tasks
max_tasks: 12
required: []
---
# Tasks: <title>
<!-- Order = dependency order; every prefix must be releasable. One package per task.
     Headings are immutable once referenced: append new tasks, never renumber.
     Over pr.max_lines? Add "- Slice: S<n>" to every task: each slice is one stacked pull request. -->

## T1: <imperative title>
- Covers: AC-1
- Expected paths: src/<area>/**
- Outermost test: <behaviour> at <layer> level
- Depends on: none
- Package: .
- Status: todo
