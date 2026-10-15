# ADR-0006: Distribution as a single-plugin marketplace

Status: accepted · Cites: K1, K6, K7

## Context
Installation must be one command for individuals and zero commands for team members.
Verified against the current Claude Code plugin, marketplace, skills, hooks and plugin-eval
documentation (CLI `claude plugin --help`, `claude plugin eval --help`).

## Decision
- Repo root is the marketplace: `.claude-plugin/marketplace.json` (`name`, `owner`, `plugins`)
  with one entry `{ "name": "sdd", "source": "./plugins/sdd" }`. The entry name and the
  `plugin.json` name are both `sdd`.
- Plugin layout under `plugins/sdd/`:
  `.claude-plugin/plugin.json` (semver `version`, `author`, `license: MIT`), `skills/<name>/SKILL.md`,
  `agents/*.md`, `hooks/hooks.json`, `scripts/`, `templates/`, `evals/`.
- Skills, not legacy `commands/`. User-only skills set `disable-model-invocation: true`.
- Plugin agents use only supported frontmatter (no `hooks`, `mcpServers`, `permissionMode`);
  read-only agents restrict `tools`.
- Hooks use exec form with `${CLAUDE_PLUGIN_ROOT}`; no state is written under the plugin root
  (it changes on update) — project state lives in `.sdd/` and `docs/`.
- Install:
  `claude plugin marketplace add <owner>/<repo>` then `claude plugin install sdd@<marketplace>`.
- Team activation: commit `.claude/settings.json` with `extraKnownMarketplaces` (GitHub source,
  optional `ref`) and `enabledPlugins: { "sdd@<marketplace>": true }`; teammates get it after the
  workspace trust prompt.
- Quality gates: `claude plugin validate .` (and `--strict` in CI); `claude plugin eval` with the
  default with/without-plugin ablation as the baseline. Model-backed evals run manually or nightly.
- Releases are git tags matching `plugin.json` `version`; CHANGELOG follows Keep a Changelog.

## Consequences
- Minimum Claude Code version is the one that supports plugin eval reports; `/sdd:init` checks it.

## Rejected alternatives
- Several plugins (core/QA/integrations): more install friction; one plugin with optional,
  user-invoked integration skills keeps the namespace simple.
