# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
[Semantic Versioning](https://semver.org/).

## [Unreleased]
### Added
- Semantic squash merges: `pr.merge` (default `squash`), `sdd forge-settings` and an `/sdd:init`
  offer to set the repository so each merge commit is the pull request title and body; `guard`
  requires titles in the commit format (`20261016-semantic-merge-small-prs`).
- Small pull requests: `pr.max_lines` (default 400) and `pr.size_exclude`, `sdd size`, task slices
  (`Slice: S<n>`, V-SLICE) shipped as stacked pull requests; ADR-0009.
- `/sdd:approve <id> plan` records every planning phase (functional, spec, tasks) in one act; `sdd
  status` names it once every planning artifact is written (`20261016-autonomous-flow-no-attribution`).
- `guard` blocks commits and `gh pr create|edit` that credit an AI assistant as co-author or carry a
  "Generated with" line naming one; `V-ATTRIBUTION` flags the same lines in open `pr.md` files. The
  author's own signature is allowed.
- ADR-0008: two interaction points, then an autonomous run to a ready pull request.

### Changed
- Skills no longer stop after each phase or task: after the route, Claude asks every question,
  writes the whole plan and asks once for `plan`; after it, it implements every task, verifies and
  opens the pull request without prompts.
- `pr.auto_ready` defaults to `true`: the pull request is marked ready for review after a GO
  verification. Set `pr.auto_ready: false` to keep the person marking it ready.
- Spec and tasks no longer require the previous phase's approval, only a valid artifact; code still
  requires every approval.

## [0.2.0] - 2026-10-16
### Added
- `paths.constitution` setting: keep the constitution anywhere inside the project; `sdd context`,
  `init` and `sdd validate` follow it (`20261015-configurable-constitution-path`).
- `V-CONSTITUTION`: `sdd validate` checks the constitution's size, invariant IDs, "violated when"
  cells, evidence files and generic wording.
- `sdd tdd log <id>` prints the recorded red and green runs; `/sdd:verify` uses it for quick changes.
- `sdd doctor --report` prints the checks and always exits 0, for use inside skills.
- `SECURITY.md`, issue templates, and `docs/design-influences.md`.

### Changed
- `/sdd:new` creates and switches to `sdd/<id>` when started on the base branch, so changes never land
  on `main` (`20261015-branch-per-change`).
- The active change follows the checked-out branch when the stored pointer is stale.
- `/sdd:init` offers to commit exactly the files it wrote as `chore: adopt sdd`.
- Setup skills for Jira and Confluence, GitHub Issues and Linear explain `/sdd:sync` and its dry run
  before any check (`20261015-discriminative-setup-evals`).
- Eval graders for the setup and verify cases are deterministic and fail without the plugin.
- The kit's own specs use the living-spec format, and the kit now develops itself with `sdd`.

### Fixed
- `detect` proposes `node --test --test-name-pattern <Name>` as the single-test command for
  `node --test` projects (`20261015-detect-node-test-single`).
- `/sdd:init` no longer aborts with a raw shell error when a prerequisite is missing
  (`20261015-doctor-never-aborts-init`).
- `sdd tdd log` rejects ids that are not change ids.
- `sdd archive` writes only the living specs that receive a delta and keeps fenced code and inline
  comments intact; `sdd validate` rejects a MODIFIED requirement that drops existing criteria
  (`20261016-archive-preserves-specs`).
- The guard hook blocks any shell command that names a change's `state.yaml` unless it only reads or stages it,
  including inline interpreter code, heredocs and write options, so an agent cannot record its own approval
  (`20261016-guard-state-writes`).

## [0.1.0] - 2026-10-15
### Added
- Marketplace with the `sdd` plugin: 20 skills, 5 subagents, `guard` and `gate` hooks.
- `quick`, `standard` and `full` routes with human approvals per phase.
- Living specs with ADDED / MODIFIED / REMOVED deltas and deterministic archive.
- `sdd` CLI: doctor, detect, init, new, status, approve, validate, archive, tdd, scan, context,
  autopilot helpers, release-check.
- Default templates with size budgets, seed rules, CI validation template.
- Optional integrations: Jira + Confluence, GitHub Issues, Linear.
- Example project covering the three routes; plugin eval suite.

[Unreleased]: https://github.com/kirthar/sdd-kit/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/kirthar/sdd-kit/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/kirthar/sdd-kit/releases/tag/v0.1.0
