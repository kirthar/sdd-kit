# Kit specs

Living specs for the `sdd` plugin itself. Each file describes current (or, until v1 ships,
target) behaviour of one capability, with immutable requirement IDs and acceptance criteria that
drive the tests and evals.

| Spec | Capability |
|---|---|
| [config](config.md) | `.sdd/config.yaml` schema and local state |
| [init](init.md) | Requirement checks, stack detection, project bootstrap |
| [lifecycle](lifecycle.md) | Routes, change folders, state, approvals, every lifecycle skill |
| [templates](templates.md) | Default templates, size budgets, project overrides |
| [validation](validation.md) | `sdd validate`, `sdd archive`, CI template |
| [hooks](hooks.md) | `guard` and `gate` hooks |
| [rules](rules.md) | Learned rules (`/sdd:learn`, `.sdd/rules.md`) and shared context |
| [integrations](integrations.md) | Setup skills and `/sdd:sync` |
| [autopilot](autopilot.md) | `/sdd:autopilot` and its subagents |
| [release-check](release-check.md) | `/sdd:release-check` |

Shared conventions
- Requirement IDs: `REQ-<SPEC>-<n>`; criteria: `AC-<SPEC>-<n>.<m>`, each with Given, When and Then.
- One CLI entry point: `node ${CLAUDE_PLUGIN_ROOT}/scripts/sdd.mjs <subcommand>`, called `sdd` below.
  Exit codes: `0` ok, `1` validation failure / NO-GO / BLOCK, `2` usage error, `3` environment
  missing. Hooks never pass these through (hooks spec).
- Subcommands: `doctor`, `detect`, `config`, `init`, `new`, `status`, `approve`, `validate`, `archive`,
  `tdd`, `scan`, `context`, `autopilot <preflight|lock|heartbeat|unlock|eligible|report>`,
  `release-check`. Every subcommand supports `--json`.
- The project root is the nearest folder with `.sdd/config.yaml` inside the git repository.
- "Human act" means a user-only skill run by the person, or a command the person runs with `!`.
