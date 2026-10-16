# Tasks: autonomous flow after approval and no AI attribution
<!-- Order = dependency order; every prefix must be releasable. One package per task.
     Headings are immutable once referenced: append new tasks, never renumber. -->

## T1: Approve a whole plan in one act
- Covers: AC-1, AC-2, AC-3, AC-4, AC-LIFE-5.5, AC-LIFE-5.6
- Expected paths: plugins/sdd/scripts/lib/approve.mjs, plugins/sdd/scripts/test/**
- Outermost test: `sdd approve <id> plan` records every planning phase at CLI level
- Depends on: none
- Package: .
- Status: done

## T2: Derive the plan approval as the next step
- Covers: AC-5, AC-6
- Expected paths: plugins/sdd/scripts/lib/changes.mjs, plugins/sdd/scripts/lib/status.mjs, plugins/sdd/scripts/test/**
- Outermost test: `sdd status` names `/sdd:approve <id> plan` at CLI level
- Depends on: T1
- Package: .
- Status: done

## T3: Block AI attribution and signatures in the guard
- Covers: AC-7, AC-8, AC-9, AC-10
- Expected paths: plugins/sdd/hooks/guard.mjs, plugins/sdd/hooks/lib/**, plugins/sdd/hooks/test/**
- Outermost test: guard decision for attributed commits and PR bodies at hook level
- Depends on: none
- Package: .
- Status: done

## T4: Reject AI attribution in open pull request bodies
- Covers: AC-11, AC-12, AC-VAL-6.1, AC-VAL-6.2
- Expected paths: plugins/sdd/scripts/lib/validate.mjs, plugins/sdd/scripts/test/**
- Outermost test: `sdd validate` reports V-ATTRIBUTION at CLI level
- Depends on: none
- Package: .
- Status: done

## T5: Default pull requests to ready for review
- Covers: AC-13, AC-14, AC-CFG-2.1
- Expected paths: plugins/sdd/scripts/lib/config.mjs, plugins/sdd/scripts/lib/init.mjs, plugins/sdd/scripts/test/**, .sdd/config.yaml, docs/specs/config.md, plugins/sdd/skills/init/**
- Outermost test: `sdd config --effective` and `sdd init --apply` show `auto_ready: true` at CLI level
- Depends on: none
- Package: .
- Status: done

## T6: Run the flow without stops in the skills
- Covers: AC-15, AC-LIFE-14.1, AC-LIFE-14.2, AC-LIFE-3.3, AC-LIFE-9.1, AC-LIFE-9.3
- Expected paths: plugins/sdd/skills/**, plugins/sdd/agents/**, plugins/sdd/references/**, plugins/sdd/templates/**, plugins/sdd/evals/**, plugins/sdd/scripts/test/**
- Outermost test: skill texts name their next command and no stop-and-offer at unit level
- Depends on: T1, T2, T5
- Package: .
- Status: done

## T7: Document the two interaction points
- Covers: AC-15
- Expected paths: docs/workflow.md, docs/specs/lifecycle.md, docs/adr/**, README.md, AGENTS.md, .sdd/rules.md, CHANGELOG.md, docs/QUICKSTART.md
- Outermost test: `sdd validate --all` passes at CLI level
- Depends on: T6
- Package: .
- Status: done
