# Delta: configurable constitution path

## Why
A project may keep its constitution outside `.sdd/` (this repository keeps it in `docs/constitution.md`), but the kit
reads and writes only `.sdd/constitution.md`. A `paths.constitution` key lets the project say where it is, and the
kit follows it.

## Reuse
- [`lib/config.mjs`](../../../plugins/sdd/scripts/lib/config.mjs): `DEFAULTS` is the single source of defaults; `merge()` fills a missing `paths` and `validateConfig` walks `DEFAULTS`, so adding the default gives REQ-CFG-1 and REQ-CFG-2 behaviour for free. Only the empty, absolute and `..` checks are new.
- [`lib/context.mjs`](../../../plugins/sdd/scripts/lib/context.mjs): already calls `loadConfig(root)`; the hard-coded path join is the only change. A missing file is already skipped silently.
- [`lib/validate.mjs`](../../../plugins/sdd/scripts/lib/validate.mjs): the `everything` branch already loads the config and runs `validateConfig`; the new warning is emitted there under V-CONFIG.
- [`lib/init.mjs`](../../../plugins/sdd/scripts/lib/init.mjs) and [`skills/init/SKILL.md`](../../../plugins/sdd/skills/init/SKILL.md): the skill's description and its write and validate steps name the literal path.
- Test templates: AC-RULE-3.1 in `scripts/test/commands.test.mjs`, AC-CFG-1.x in `scripts/test/core.test.mjs`.
- No existing helper resolves the constitution path; the literal is repeated in code, skills, templates and docs. This change adds one resolver (the config value) and does not add a second.

## ADDED

### REQ-CFG-5: Constitution path
`paths.constitution` (string, default `.sdd/constitution.md`) is the location of the project constitution, relative to
the project root. The schema block of this spec gains `paths: { constitution: .sdd/constitution.md }`. A wrong type
is an error under REQ-CFG-1; an empty, absolute or `..`-containing value is an error on
`V-CONFIG paths.constitution`. `sdd context` and the init skill treat such a value as unset (default path) and never
read or write outside the project root. Commands and skills that read or write the constitution use this key and not
the literal default; the autopilot hooks are excluded (see Open questions). When the configured file does not exist
and `.sdd/config.yaml` exists, `sdd validate` warns (`V-CONFIG paths.constitution`, level warn) with the resolved
path and exits 0 if nothing else fails.
- AC-CFG-5.1 Given a config with only `version: 1`, When `sdd config` runs, Then `paths.constitution` is `.sdd/constitution.md`.
- AC-CFG-5.2 Given `paths.constitution: docs/constitution.md` and no such file, When `sdd validate --all` runs, Then it
  exits 0 with a `V-CONFIG paths.constitution` warning naming `docs/constitution.md`.
- AC-CFG-5.3 Given `paths.constitution: /etc/constitution.md`, When `sdd validate --all` runs, Then it exits 1 with
  `V-CONFIG paths.constitution`.
- AC-CFG-5.4 Given `paths.constitution: ../c.md`, When `sdd validate --all` runs, Then it exits 1 with
  `V-CONFIG paths.constitution`.
- AC-CFG-5.5 Given `paths.constitution: ""`, When `sdd validate --all` runs, Then it exits 1 with
  `V-CONFIG paths.constitution`.
- AC-CFG-5.6 Given the configured file exists, When `sdd validate --all` runs, Then no constitution warning is printed.
- AC-CFG-5.7 Given no `.sdd/config.yaml` and no constitution, When `sdd validate --all` runs, Then no constitution
  warning is printed.

## MODIFIED

### REQ-RULE-3: Shared context
Shared context (`sdd context`). Every `/sdd:*` skill injects it before running. It
prints the active change (id, route, derived phase, missing approvals), the constitution read from
`paths.constitution` (config spec), and the rules: full text up to 80 lines in total, then titles only; quick changes
get titles only. A missing constitution file is skipped without error.
- AC-RULE-3.1 Given three rules and a standard change, When `sdd context` runs, Then each rule's
  title and "How to apply" line are printed.
- AC-RULE-3.2 Given no `.sdd/`, When `sdd context` runs, Then it prints a one-line hint to run
  `/sdd:init` and exits 0.
- AC-RULE-3.3 Given `paths.constitution: docs/constitution.md` and that file, When `sdd context` runs, Then its text
  is printed.
- AC-RULE-3.4 Given the default path and a constitution at `.sdd/constitution.md`, When `sdd context` runs, Then its
  text is printed.
- AC-RULE-3.5 Given `paths.constitution: ../c.md` and a file at that location, When `sdd context` runs, Then that
  file's text is not printed and the command exits 0.

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

## REMOVED
None.

## Acceptance criteria
- AC-1 Given this repository's config sets `paths.constitution: docs/constitution.md`, When `sdd validate --all`
  runs, Then no constitution warning is printed.

The other criteria are AC-CFG-5.1 to 5.7, AC-RULE-3.3 to 3.5 and AC-INIT-5.2 to 5.4 above.

## Open questions
- NON-BLOCKING: autopilot write protection for the constitution is hard-coded to `.sdd/constitution.md` in
  [`hooks/gate.mjs`](../../../plugins/sdd/hooks/gate.mjs) and [`hooks/guard.mjs`](../../../plugins/sdd/hooks/guard.mjs),
  so a moved constitution loses it. Out of scope here (hot path, own tests); follow up as a separate change.
- NON-BLOCKING: V-LEAK scans only `docs/` and `.sdd/`; a constitution elsewhere is not scanned.
- NON-BLOCKING: `AGENTS.md:20` and `templates/agents-section.md:23` name the literal path; update both together
  during implementation (re-init rewrites the section from the template).
- NON-BLOCKING: `REQ-INIT-5`/`AC-INIT-5.1` claim validate checks the constitution's size and denylist, but no such
  check was found in `validate.mjs`; pre-existing gap, not addressed here.
- NON-BLOCKING: capabilities in `state.yaml` are `[config, rules]`; this delta also touches `init`. The person adds
  `init` before approval (agents cannot edit `state.yaml`).
- NON-BLOCKING: changing the key later does not move an existing file; `sdd validate` only warns about the new path.
- NON-BLOCKING: other places naming the literal path (`agents/sdd-spec-reviewer.md`, `docs/specs/hooks.md`,
  `docs/specs/autopilot.md`, `docs/teams.md`, `CONTRIBUTING.md`, `examples/bookings/AGENTS.md`); tasks search for
  them (R9).
- Out of scope: move tooling, `.sdd/config.yaml` and `.sdd/rules.md` paths, hook changes.
