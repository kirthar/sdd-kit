---
template: tasks
max_tasks: 12
required: []
---
# Tasks: configurable constitution path

## T1: Add the constitution path config key with validation
- Covers: AC-CFG-5.1, AC-CFG-5.3, AC-CFG-5.4, AC-CFG-5.5
- Expected paths: plugins/sdd/scripts/lib/config.mjs, plugins/sdd/scripts/test/core.test.mjs, plugins/sdd/scripts/test/commands.test.mjs
- Outermost test: `sdd config` prints the default and `sdd validate --all` exits 1 with V-CONFIG paths.constitution for absolute, `..` and empty values at CLI level
- Depends on: none
- Package: .
- Status: done

## T2: Warn when the configured constitution file is missing
- Covers: AC-CFG-5.2, AC-CFG-5.6, AC-CFG-5.7
- Expected paths: plugins/sdd/scripts/lib/validate.mjs, plugins/sdd/scripts/test/commands.test.mjs
- Outermost test: `sdd validate --all` exits 0 with a V-CONFIG paths.constitution warning only when the config exists and the file does not, at CLI level
- Depends on: T1
- Package: .
- Status: done

## T3: Read the constitution from the configured path in sdd context
- Covers: AC-RULE-3.1, AC-RULE-3.2, AC-RULE-3.3, AC-RULE-3.4, AC-RULE-3.5
- Expected paths: plugins/sdd/scripts/lib/context.mjs, plugins/sdd/scripts/test/commands.test.mjs
- Outermost test: `sdd context` prints the constitution from the configured or default path and ignores an out-of-root value, exiting 0, at CLI level
- Depends on: T1
- Package: .
- Status: done

## T4: Plan and apply the constitution location in init
- Covers: AC-INIT-5.3, AC-INIT-5.4
- Expected paths: plugins/sdd/scripts/lib/init.mjs, plugins/sdd/scripts/test/init.test.mjs
- Outermost test: `init --plan` records the constitution path only when non-default and `init --apply` writes the constitution only at the confirmed location, at script level (`lib/init.mjs`)
- Depends on: T1
- Package: .
- Status: done

## T5: Make the init skill follow the configured constitution path
- Covers: AC-INIT-5.1, AC-INIT-5.2
- Expected paths: plugins/sdd/skills/init/SKILL.md, plugins/sdd/evals/init-constitution-path/**
- Outermost test: new init eval proposes the configured location on re-run and does not create `.sdd/constitution.md`, at eval level; AC-INIT-5.1 is shown by an observed `sdd validate` run on a generated constitution, and the missing size and denylist check (pre-existing gap) is reported, not fixed here
- Depends on: T4
- Package: .
- Status: todo

## T6: Configure this repository and replace literal constitution paths
- Covers: AC-1
- Expected paths: .sdd/config.yaml, AGENTS.md, plugins/sdd/templates/agents-section.md, plugins/sdd/agents/sdd-spec-reviewer.md, docs/teams.md, examples/bookings/AGENTS.md, docs/specs/config.md, docs/specs/rules.md, docs/specs/init.md
- Outermost test: `sdd validate --all` on this repository prints no constitution warning, at CLI level
- Depends on: T1, T2, T3, T4
- Package: .
- Status: todo

Notes for T6: edit `AGENTS.md` and `templates/agents-section.md` together (re-init rewrites the section from the template). Merge the delta into the living specs `config.md`, `rules.md` and `init.md`. Leave `docs/specs/hooks.md` and the hooks as they are: they stay on the default path (out of scope), so this repository's constitution loses autopilot write protection until the follow-up change; the PR description says so. A search found no literal in `CONTRIBUTING.md` or `docs/specs/autopilot.md`. The person adds `init` to `capabilities` in `state.yaml` before approval.
