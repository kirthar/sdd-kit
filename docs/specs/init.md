# Spec: init

Status: current · Cites: K1, K5, K8 · ADRs: 0004, 0006, 0007

## Purpose
`/sdd:init` (user-only) makes a repository ready for the process in one confirmed step, for any
stack, without editing the kit.

## Out of scope
Installing toolchains; CI beyond the optional validation workflow.

## Requirements

### REQ-INIT-1: Prerequisites
Prerequisites (`sdd doctor`). Checks git, Node.js against
`scripts/requirements.json`, the Claude Code version (`claude --version`), and that the directory is
a git work tree. `doctor` is written in syntax that runs on Node 14+ so it can report an old Node.
- AC-INIT-1.1 Given Node 18, When init runs, Then it stops with exit 3, names Node and the required
  version, and writes nothing.
- AC-INIT-1.2 Given all prerequisites, When `sdd doctor --json` runs, Then every check reports `ok`
  with the detected version.

### REQ-INIT-2: Stack detection
Stack detection (`sdd detect`). A pure function of the file tree: packages from
manifests and workspace declarations; test, single-test, lint, format and build commands per package;
wrappers (`Makefile`, package scripts, `mvnw`/`gradlew`) win over raw tools.
- AC-INIT-2.1 Given a Node fixture with `test`, `lint`, `format` scripts and `pnpm-lock.yaml`, When
  detect runs, Then the commands are `pnpm test`, `pnpm lint`, `pnpm format`.
- AC-INIT-2.2 Given a Maven fixture with `mvnw`, When detect runs, Then test is `./mvnw test` and
  single-test is `./mvnw test -Dtest=<Name>`.
- AC-INIT-2.3 Given a Python fixture whose `pyproject.toml` declares pytest and ruff, When detect
  runs, Then test is `pytest`, lint `ruff check .`, format `ruff format .`.
- AC-INIT-2.4 Given a `Makefile` with a `test` target, When detect runs, Then test is `make test`.
- AC-INIT-2.5 Given an undetectable command, When detect runs, Then it is empty and listed under
  `unresolved`.

### REQ-INIT-3: Conventions
Base branch (remote HEAD, else `main`/`master`); commit format from the
last 50 subjects.
- AC-INIT-3.1 Given ≥70% conventional subjects, When detect runs, Then `commit.format` is
  `conventional`.

### REQ-INIT-4: Proposal then confirmation
Proposal, then confirmation. Shows the full proposal — config, constitution, empty
rules, `AGENTS.md` section, `CLAUDE.md` import line, `.gitignore` entry for `.sdd/local/` — and
writes only the confirmed plan (`sdd init --plan` / `sdd init --apply <plan.json>`). After writing,
it offers, as a separate yes/no, to commit exactly the written paths as `chore: adopt sdd`. The
commit is made by the skill, not by `sdd init --apply`; declining leaves the files uncommitted.
- AC-INIT-4.1 Given the person declines, When init ends, Then `git status` is clean.
- AC-INIT-4.2 Given an existing config, When init re-runs, Then it shows a diff and keeps values the
  person set unless they confirm changes.

### REQ-INIT-5: Constitution from the project
The init skill writes the constitution to `paths.constitution`: the existing value when the config has one,
otherwise a proposed location shown in the proposal (default `.sdd/constitution.md`), recorded in the proposed config
only when it differs from the default. The constitution is ≤40 lines, 3–10 invariants; each has "violated when" and
cites at least one repository file as evidence; words from a generic-values denylist ("quality", "simplicity",
"best practices"…) are rejected.
- AC-INIT-5.1 Given a generated constitution, When `sdd validate` runs, Then size, ID format,
  evidence links and the denylist pass.
- AC-INIT-5.2 Given a config with `paths.constitution: docs/constitution.md`, When init re-runs, Then it proposes
  that location and does not create `.sdd/constitution.md`.
- AC-INIT-5.3 Given a proposed location other than the default, When `sdd init --plan` runs, Then the proposed config
  contains `paths.constitution` with it; given the default, Then the key is absent.
- AC-INIT-5.4 Given a confirmed plan with a custom location, When `sdd init --apply` runs, Then the constitution is
  written there and nowhere else.

AC-INIT-5.2 to 5.4 are covered by script tests of `lib/init.mjs`; the skill's prose is covered by its eval.

### REQ-INIT-6: Agent instructions
`AGENTS.md` gets a marked section (`<!-- sdd:begin -->` …
`<!-- sdd:end -->`, ≤40 lines); `CLAUDE.md` gets `@AGENTS.md` if missing.
- AC-INIT-6.1 Given an `AGENTS.md` with other content, When init re-runs, Then only the marked
  section changes.

### REQ-INIT-7: Optional extras
Optional extras, each a separate yes/no. Seed rules by group; the CI validation
workflow; team activation in `.claude/settings.json` (`extraKnownMarketplaces` + `enabledPlugins`);
a `permissions.allow` list for the detected commands plus `git add|commit` and `gh pr create`
(needed for unattended autopilot runs).
- AC-INIT-7.1 Given the person accepts only team activation, When init ends, Then
  `.claude/settings.json` contains exactly the marketplace and plugin entries and nothing else changed.

### REQ-INIT-8: Forge merge settings
`sdd forge-settings` prints, for the configured `pr.merge`, the repository settings that make the
merge commit semantic and the single `gh api -X PATCH repos/{owner}/{repo}` command that applies
them: only the configured method allowed; its commit title from the pull request title and its
message from the pull request body; `delete_branch_on_merge` on, so stacked pull requests retarget
to the base branch when the one below merges. `/sdd:init` shows them in its single confirmation
and, once confirmed and `gh` is authenticated, runs the command; otherwise it hands the command to
the person. With `pr.forge: none` it prints nothing to apply.

## History
