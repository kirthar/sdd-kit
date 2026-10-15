# ADR-0004: Stack independence through detected configuration

Status: accepted · Cites: K5

## Context
Process kits often hard-code a stack ("run npm test"). The kit must work unchanged in a Node,
Java or Python repository, or a polyglot monorepo.

## Decision
- `/sdd:init` detects stacks from manifests (`package.json`, `pom.xml`, `build.gradle(.kts)`,
  `pyproject.toml`, `go.mod`, `Cargo.toml`, `Makefile`) and proposes `.sdd/config.yaml`:

  ```yaml
  version: 1
  base_branch: main
  packages:            # one entry per deployable or workspace
    - path: .
      commands:        # wrappers (make/scripts) win over raw tools when present
        test: <detected>
        test_single: <detected or empty>
        lint: <detected>
        format: <detected>   # rewrites files: runs before tests
        build: <detected>
  testing: { tdd: strict, doubles: explicit }   # tdd: strict | on-request
  git: { integration: merge }                   # merge | rebase
  commit: { format: <detected from history> }
  pr: { draft: true, auto_ready: false }
  gates: { enforce: true }
  routes: { quick_max_files: 5 }
  integrations: {}     # empty = files only
  ```
- Nothing is written without confirmation; re-running `init` shows a diff.
- Skills read commands from config and never name a tool. Stack-specific advice (test layers,
  doubles) lives in small per-stack reference files loaded only when that stack is detected.
- Undetectable commands are left empty and the skill asks once, then persists the answer.

## Consequences
- Detection is a pure function of the file tree, tested with fixture repos (Node, Java, Python).

## Rejected alternatives
- Per-stack plugins: multiplies maintenance and breaks polyglot repos.
