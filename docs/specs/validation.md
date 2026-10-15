# Spec: validation, archive, scan, CI

Status: current · Cites: K2, K4, K9, K10 · ADRs: 0002, 0003, 0007

## Purpose
Deterministic checks that run identically on a laptop, in a skill, and in CI.

## Requirements

### REQ-VAL-1: Validate
`sdd validate [<id>|--all|--specs|--templates]`. Each finding carries a rule ID and
`path:line`.

| Rule | Check | Level |
|---|---|---|
| V-CONFIG | `.sdd/config.yaml` schema (config spec) | error / warn |
| V-STATE | `state.yaml` schema; approvals only for phases the route has; `plans.T<n>` only for existing tasks | error |
| V-QUICK | A quick change contains only `state.yaml`, `brief.md`, optional PR body | error |
| V-SECTIONS | Required headings of the resolved template | error |
| V-SIZE | Budget (warn > 1×, error > 1.5×) | warn / error |
| V-HEADING | Task and requirement heading format | error |
| V-AC-FORMAT | Each `AC-…` item contains Given, When and Then | error |
| V-TRACE | Every task covers ≥1 existing criterion; every criterion covered by ≥1 task | error |
| V-TASK-FIELDS | Covers, Expected paths, Outermost test, Depends on, Package | error |
| V-OPENAPI | `contracts/*.yaml` valid OpenAPI 3.x (pinned redocly via npx, else structural) | error |
| V-DELTA | MODIFIED / REMOVED reference existing `REQ-` IDs; ADDED IDs are new | error |
| V-OPEN-Q | A phase approval exists while that phase's artifact has a BLOCKING open question | error |
| V-UNVERIFIED | Living spec with `status: unverified` | warn |
| V-RULES | `.sdd/rules.md` format; unique titles and IDs | error |
| V-CONSTITUTION | The file at `paths.constitution`: ≤40 counted lines; each invariant row has an ID matching `[A-Z]+[0-9]+`, a "Violated when" cell and an Evidence cell naming an existing repository file; no generic-value words ("quality", "simplicity", "best practices", "clean code", "excellence") | error |
| V-LEAK | Absolute home paths, emails or token patterns in `docs/` and `.sdd/` | error |

- AC-VAL-1.1 Given a task without Covers, When validate runs, Then it exits 1 with
  `V-TASK-FIELDS docs/changes/<id>/tasks.md:<line>`.
- AC-VAL-1.2 Given a criterion no task covers, When validate runs, Then it exits 1 with V-TRACE
  naming the criterion.
- AC-VAL-1.3 Given an invalid contract and `SDD_OFFLINE=1`, When validate runs, Then it exits 1
  and reports `mode: structural`.
- AC-VAL-1.4 Given each example change in `examples/bookings`, When `validate --all` runs, Then it
  exits 0 with zero findings.
- AC-VAL-1.5 Given this repository's `docs/specs`, When `validate --specs` runs, Then it exits 0
  (the kit dogfoods its own format).

### REQ-VAL-2: Archive deltas
`sdd archive <id>`. (called from the user-only skill). Preconditions: the change
validates; every PR in `state.yaml` is merged (checked with `gh` when available, otherwise the person
confirms in the skill). Applies deltas — from `delta.md` or `technical.md` § Living spec deltas — to
`docs/specs/<cap>.md`: ADDED appended in ID order, MODIFIED replaced by its full text, REMOVED
deleted with a `## History` line. Moves the folder to `docs/changes/archive/<id>/`, then re-validates.
- AC-VAL-2.1 Given MODIFIED `REQ-BOOK-9` that does not exist, When archive runs, Then it exits 1 and
  no file changes.
- AC-VAL-2.2 Given a valid delta fixture, When archive runs, Then the living spec equals the golden
  file byte for byte.
- AC-VAL-2.3 Given a quick change, When archive runs, Then only the folder moves.

### REQ-VAL-3: Secret scan
`sdd scan [--diff <base>] [--file <path>]`. Pattern families: private keys, cloud
access keys, forge tokens, chat tokens, JWT-shaped strings, generic `key=`/`secret=` assignments
with high entropy. Output names the rule and location, never the value; exit 1 on a hit.
- AC-VAL-3.1 Given one fixture per family, When scan runs, Then each is reported and stdout and
  stderr never contain the fixture value.

### REQ-VAL-4: Test first log
`sdd tdd red|green -- <cmd>`. Runs the command, asserts it failed (red) or passed
(green), and appends `{time, change, phase, cmd, exit}` to the tdd log. A red run that passes, or a
green run that fails, exits 1.
- AC-VAL-4.1 Given `sdd tdd red -- node -e "process.exit(0)"`, When it runs, Then it exits 1 with
  "expected failure, got success".

### REQ-VAL-5: CI template
`templates/ci/sdd-validate.yml` (GitHub Actions): checks out the
project and the kit at a pinned ref, sets up Node 20, runs `sdd validate --all`.
- AC-VAL-5.1 Given the template, When actionlint runs in this repo's CI, Then it passes.
