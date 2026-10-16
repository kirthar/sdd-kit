# Tasks: conflict-free pull requests
<!-- Order = dependency order; every prefix must be releasable. One package per task.
     Headings are immutable once referenced: append new tasks, never renumber. -->

## T1: Restack a slice onto the squash of the slice below
- Covers: AC-1, AC-2, AC-3, AC-4, AC-5
- Expected paths: plugins/sdd/scripts/lib/restack.mjs, plugins/sdd/scripts/sdd.mjs, plugins/sdd/scripts/test/**
- Outermost test: `sdd restack` on a fixture stack at CLI level
- Depends on: none
- Package: .
- Status: done

## T2: Check a branch for conflicts with its base
- Covers: AC-6
- Expected paths: plugins/sdd/scripts/lib/conflicts.mjs, plugins/sdd/scripts/sdd.mjs, plugins/sdd/scripts/test/**
- Outermost test: `sdd conflicts --base main` on fixture branches at CLI level
- Depends on: none
- Package: .
- Status: done

## T3: Fold change changelog entries into the changelog on archive
- Covers: AC-7, AC-8, AC-9
- Expected paths: plugins/sdd/scripts/lib/archive.mjs, plugins/sdd/scripts/lib/config.mjs, plugins/sdd/scripts/lib/validate.mjs, plugins/sdd/templates/changelog.md, plugins/sdd/scripts/test/**, docs/specs/config.md
- Outermost test: `sdd archive` with a changelog entry at CLI level
- Depends on: none
- Package: .
- Status: done

## T4: Use restack the conflict check and changelog entries in the skills
- Covers: AC-10
- Expected paths: plugins/sdd/skills/**, plugins/sdd/templates/**, plugins/sdd/references/**, plugins/sdd/scripts/test/**
- Outermost test: skill texts at unit level
- Depends on: T1, T2, T3
- Package: .
- Status: done

## T5: Document pull requests that merge without conflicts
- Covers: AC-10
- Expected paths: docs/workflow.md, docs/adr/**, README.md, AGENTS.md, .sdd/rules.md, docs/changes/20261016-conflict-free-prs/changelog.md, CONTRIBUTING.md
- Outermost test: `sdd validate --all` passes at CLI level
- Depends on: T4
- Package: .
- Status: done
