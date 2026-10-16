# Spec: configuration and project state

Status: current · Cites: K1, K5, K7 · ADRs: 0004, 0005

## Purpose
One schema for every key any command, hook or script reads, so nothing is implicit.

## `.sdd/config.yaml` (committed)

```yaml
version: 1
language: en                       # language of generated artifacts
base_branch: main
packages:                          # ≥1; detected by init
  - path: .
    commands: { test: "", test_single: "", lint: "", format: "", build: "" }
testing: { tdd: strict, doubles: explicit }   # tdd: strict | on-request · doubles: explicit | any
git: { integration: merge }                   # merge | rebase
commit: { format: conventional }              # conventional | ticket-prefix | free
pr: { draft: true, auto_ready: true, forge: github }    # forge: github | none; auto_ready: mark ready after a GO verification
pr: { merge: squash, max_lines: 400 }                     # merge: squash | merge | rebase; max_lines: review budget per PR
# pr.size_exclude: globs not counted by `sdd size` (default: docs, tests, lockfiles, vendor)
gates: { enforce: true, exempt: [] }          # exempt: extra globs the gate never blocks
routes: { quick_max_files: 5 }                # predicted files; above ⇒ at least standard
release: { branch: main }
autopilot:
  enabled: false
  worktree_root: "../{repo}-worktrees"
  budgets: { tasks: 3, repairs: 1, ci_polls: 3, minutes: 60 }
  tripwires: { paths: [], keywords: [], max_files: 5 }
integrations: {}                   # see integrations spec; empty = files only
paths: { constitution: .sdd/constitution.md, changelog: CHANGELOG.md }   # relative to the project root
```

## Local state (never committed)

| Path | Content | Scope |
|---|---|---|
| `<git-dir>/sdd/active` | Active change id; a hint only: readers resolve it per REQ-LIFE-13, so a stale pointer falls back to the single open change and is never rewritten | Per worktree (read without spawning git: `.git` dir or `gitdir:` file) |
| `<git-common-dir>/sdd/locks/` | Autopilot locks + heartbeat | Shared by all worktrees |
| `<git-common-dir>/sdd/tdd/<id>.log` | Red/green runs recorded by `sdd tdd` | Shared |
| `.sdd/local/` (gitignored) | `pause` kill switch, autopilot reports | Main checkout |

## Requirements

### REQ-CFG-1: Schema validation
Schema validation (V-CONFIG). Unknown keys warn; wrong types or enum values error,
naming the key path.
- AC-CFG-1.1 Given `testing.tdd: sometimes`, When `sdd validate` runs, Then it exits 1 with
  `V-CONFIG testing.tdd`.
- AC-CFG-1.2 Given a key `foo: 1`, When `sdd validate` runs, Then it exits 0 with a warning.

### REQ-CFG-2: Defaults
Missing keys take the defaults above; `sdd config --effective` prints the
merged result. `pr.auto_ready` defaults to `true`, and `sdd init` writes `auto_ready: true`.
- AC-CFG-2.1 Given a config with only `version: 1`, When `sdd config --effective` runs, Then
  `gates.enforce` is `true`, `pr.draft` is `true` and `pr.auto_ready` is `true`.

### REQ-CFG-3: Kit requirements
live in `scripts/requirements.json` (min Node, min Claude Code,
pinned OpenAPI linter version), not in `plugin.json`.

### REQ-CFG-4: Environment overrides
`SDD_OFFLINE=1` forces offline validation modes;
`SDD_CONFIG=<path>` points to another config (tests only).
- AC-CFG-4.1 Given `SDD_OFFLINE=1`, When a contract is validated, Then the report says
  `mode: structural` and no network call is attempted.

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

### REQ-CFG-6: Merge method and size budget
`pr.merge` (`squash` | `merge` | `rebase`, default `squash`) is how pull requests are integrated.
`pr.max_lines` (integer ≥ 1, default 400) is the review budget of one pull request.
`pr.size_exclude` (list of globs) names files that do not count; default: `docs/**`, `**/test/**`,
`**/tests/**`, `**/__tests__/**`, `**/*.test.*`, `**/*.spec.*`, `**/*_test.*`, lockfiles
(`**/package-lock.json`, `**/pnpm-lock.yaml`, `**/yarn.lock`, `**/*.lock`) and `**/vendor/**`.
Wrong types or values are V-CONFIG errors naming the key.

### REQ-CFG-7: Changelog path
`paths.changelog` (string, project-relative, default `CHANGELOG.md`). Same checks as
`paths.constitution` under V-CONFIG.

## History
