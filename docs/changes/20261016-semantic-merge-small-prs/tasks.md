# Tasks: semantic squash merges and small stacked pull requests
<!-- Order = dependency order; every prefix must be releasable. One package per task.
     Headings are immutable once referenced: append new tasks, never renumber. -->

## T1: Add merge method and size budget to the config
- Covers: AC-1, AC-2
- Expected paths: plugins/sdd/scripts/lib/config.mjs, plugins/sdd/scripts/lib/init.mjs, plugins/sdd/scripts/test/**, docs/specs/config.md
- Outermost test: `sdd config --effective` and `sdd validate` at CLI level
- Depends on: none
- Package: .
- Slice: S1
- Status: done

## T2: Block pull request titles outside the commit format
- Covers: AC-3, AC-4, AC-5
- Expected paths: plugins/sdd/hooks/guard.mjs, plugins/sdd/hooks/test/**
- Outermost test: guard decision for `gh pr create --title` at hook level
- Depends on: T1
- Package: .
- Slice: S1
- Status: done

## T3: Print the forge merge settings for the config
- Covers: AC-6, AC-7, AC-8
- Expected paths: plugins/sdd/scripts/sdd.mjs, plugins/sdd/scripts/lib/forge.mjs, plugins/sdd/scripts/test/**, plugins/sdd/skills/init/**
- Outermost test: `sdd forge-settings --json` at CLI level
- Depends on: T1
- Package: .
- Slice: S1
- Status: todo

## T4: Apply the forge merge settings to this repository
- Covers: AC-9
- Expected paths: .sdd/config.yaml
- Outermost test: `gh api repos/{owner}/{repo}` shows the settings `sdd forge-settings` prints (observed run)
- Depends on: T3
- Package: .
- Slice: S1
- Status: todo

## T5: Count pull request size against the budget
- Covers: AC-10
- Expected paths: plugins/sdd/scripts/sdd.mjs, plugins/sdd/scripts/lib/size.mjs, plugins/sdd/scripts/test/**
- Outermost test: `sdd size --base main` on a fixture repository at CLI level
- Depends on: T1
- Package: .
- Slice: S2
- Status: todo

## T6: Validate slices in tasks
- Covers: AC-11, AC-12, AC-13
- Expected paths: plugins/sdd/scripts/lib/markdown.mjs, plugins/sdd/scripts/lib/validate.mjs, plugins/sdd/scripts/test/**, plugins/sdd/templates/tasks.md
- Outermost test: `sdd validate` reports V-SLICE at CLI level
- Depends on: none
- Package: .
- Slice: S2
- Status: todo

## T7: Open one stacked pull request per slice in the skills
- Covers: AC-14, AC-15
- Expected paths: plugins/sdd/skills/**, plugins/sdd/templates/**, plugins/sdd/references/**, plugins/sdd/agents/**, plugins/sdd/evals/**, plugins/sdd/scripts/test/**
- Outermost test: skill and template texts at unit level
- Depends on: T5, T6
- Package: .
- Slice: S2
- Status: todo

## T8: Document squash merges and stacked slices
- Covers: AC-14
- Expected paths: docs/workflow.md, docs/specs/lifecycle.md, docs/adr/**, README.md, AGENTS.md, .sdd/rules.md, CHANGELOG.md, docs/QUICKSTART.md
- Outermost test: `sdd validate --all` passes at CLI level
- Depends on: T7
- Package: .
- Slice: S2
- Status: todo
