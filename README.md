# sdd — spec-driven development for Claude Code

[![CI](https://github.com/kirthar/sdd-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/kirthar/sdd-kit/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/kirthar/sdd-kit)](https://github.com/kirthar/sdd-kit/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)](https://code.claude.com/docs/en/plugins)

**Problem:** coding agents either skip design entirely or bury a one-line fix under pages of spec.
They also take irreversible actions (force pushes, merges) and forget the lessons from last week.

**sdd** gives Claude Code a process that scales with the change, keeps specs in your repository,
and enforces the rules that matter with hooks and validators — not just prompts.

![Demo: a quick fix with a failing test first, a blocked force push and a draft pull request](docs/assets/demo.svg)

## Why

Coding agents are fast, and a team needs more than speed to trust them. Without a process that
scales with the size of a change, small fixes drown in ceremony while large ones skip design.
Without automatic guardrails, one force push or self-approved step undoes that trust; without
measurement, nobody knows whether the agent actually follows the process. This kit encodes how a
team works with agents: the size of the change sets the process, a person approves each phase,
critical rules are enforced by tools, and the effect is measured with evals.

## Three routes

| Route | For | You get | You approve |
|---|---|---|---|
| `quick` | bugs, small changes | a 15-line brief, a failing test first, a short draft PR — **no spec** | the route |
| `standard` | changes to existing behaviour | a spec delta against living specs, tasks | route · spec · tasks |
| `full` | new capabilities | functional spec, technical spec, OpenAPI contracts, ADRs, tasks | route · functional · spec · tasks |

`/sdd:new` proposes the route; a person confirms it. Living specs in `docs/specs/` always describe
current behaviour: each merged change folds its ADDED / MODIFIED / REMOVED deltas in with
`/sdd:archive`.

## Install

```bash
claude plugin marketplace add kirthar/sdd-kit
claude plugin install sdd@sdd-kit
```

Then, in your repository: `/sdd:init`. Requirements: Claude Code, git, Node.js ≥ 20.

## What is enforced, not just suggested

- **guard hook** — blocks force push, history rewrites, branch deletion, merge, approve, reviewer
  requests and @mentions. Every block prints the exact command so *you* can run it.
- **gate hook** — no code edits until the change's route (and spec and tasks, when required) are
  approved; approvals are recorded only by `/sdd:approve`, which only a person can run.
- **validators** — template sections and size budgets, Given/When/Then criteria, every task covers a
  criterion and every criterion has a task, valid OpenAPI, no leaked paths or tokens. Same command
  locally and in CI.
- **learned rules** — `/sdd:learn` turns an agent mistake into a rule every command reads.

## Commands

`/sdd:new` · `/sdd:refine` · `/sdd:spec` · `/sdd:tasks` · `/sdd:implement` · `/sdd:verify` ·
`/sdd:test-plan` · `/sdd:pr` · `/sdd:status` — run by you or proposed by Claude.
`/sdd:init` · `/sdd:approve` · `/sdd:archive` · `/sdd:adopt` · `/sdd:learn` · `/sdd:sync` ·
`/sdd:autopilot` · `/sdd:release-check` — only you can run these.

## How this was built

The kit was built with its own method: a constitution and ADRs first, component specs with
acceptance criteria, evals written before the skills, then implementation by directing Claude Code
task by task with tests first. The specs, ADRs and evals live in this repository, and the
improvement over a no-plugin baseline is measured in [docs/evals.md](docs/evals.md).

## Learn more

- [Quickstart](docs/QUICKSTART.md) — first change in five minutes
- [Workflow diagram](docs/workflow.md) — the whole flow as a sequence diagram
- [Example project](examples/bookings/) — all three routes, files only
- [Adopting in an existing project](docs/adoption.md)
- [Rolling out to a team](docs/teams.md)
- [Optional integrations](docs/integrations.md) — Jira, Confluence, GitHub Issues, Linear
- [Design decisions](docs/adr/) · [Component specs](docs/specs/) · [Evals](docs/evals.md) · [Design influences](docs/design-influences.md)

MIT licensed.

Author: Chris Fuertes — [chris.cat](https://chris.cat)
