# ADR-0007: Node.js as the single runtime for scripts and hooks

Status: accepted · Cites: K5, K8, K9

## Context
Hooks, validators, the archive merger, stack detection and the autopilot helpers must run on
macOS, Linux and Windows in any project, and must be testable. OpenAPI validation needs a mature
parser; the best maintained options are Node packages runnable through `npx`.
Claude Code itself does not guarantee a Node.js installation.

## Decision
- Every script and hook is an ES module for Node.js ≥ 20, using only the standard library plus
  one vendored, MIT-licensed YAML parser in `scripts/vendor/` (with its license file).
- Tests use the built-in `node:test` runner; no dev dependency is required to run them.
- OpenAPI validation: `npx --yes @redocly/cli lint` when `npx` and network are available; otherwise
  a built-in structural check (OpenAPI version, info, paths, `$ref` resolution inside the file)
  runs and the report says which mode was used.
- Hooks run in exec form: `node ${CLAUDE_PLUGIN_ROOT}/hooks/<name>.mjs`.
- `/sdd:init` checks `node --version`, `git --version` and the Claude Code version, and stops with
  install guidance if any is missing.

## Consequences
- If Node is absent, hooks error non-blockingly; `init` prevents reaching that state silently,
  and the README lists Node as a requirement.
- Python is not used anywhere in the plugin.

## Rejected alternatives
- Python stdlib: no OpenAPI validator without `pip`; not preinstalled on Windows.
- Shell scripts: untestable quoting and no Windows support.
