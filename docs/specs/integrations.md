# Spec: optional integrations

Status: current · Cites: K1, K6, K7 · ADRs: 0005

## Purpose
Let teams mirror specs and tasks into their own wiki and tracker without the kit depending on,
or shipping, any server.

## Requirements

### REQ-INT-1: Setup skills
Setup skills (auto). `setting-up-jira-confluence`, `setting-up-github-issues`,
`setting-up-linear`. Each: first explains what enabling the integration gives the person
(`/sdd:sync` mirrors specs and tasks after a dry run; nothing is written before confirmation),
before any check, so it is shown on every exit path including an early stop; detects whether a
suitable MCP server or CLI (`gh`) is already available; guides the person to add their own (with
`<placeholders>` for URLs), keeping credentials in environment variables or their secret manager;
runs a read-only connection test; writes the `integrations` block of `.sdd/config.yaml` only
after confirmation.
- AC-INT-1.1 Given a completed setup, When the repository is scanned, Then no URL, host, project key or token is written to any repository file except
  the person-provided project/space identifiers in `.sdd/config.yaml`.
- AC-INT-1.2 Given the connection test fails, When setup ends, Then the integration is not enabled and the
  failure is explained (auth vs not found vs network).
- AC-INT-1.3 Given a setup skill starts, When it reaches its first check, Then it has already named `/sdd:sync`, the dry run and that nothing is written before confirmation.
- AC-INT-1.4 Given setup ended without confirmation, When `.sdd/config.yaml` is read, Then it contains no `kind:` entry.

### REQ-INT-2: Sync
`/sdd:sync [<id>]` (user-only). For each enabled integration: dry-run listing
every create/update (spec page, one ticket per task with a body that links back to the repo
file and heading, dependency links), then confirmation, then apply. Remote IDs are stored in
`docs/changes/<id>/sync.yaml`, making re-runs reconcile instead of duplicate. One write is
performed and read back before the rest.
- AC-INT-2.1 Given no integration configured, When sync runs, Then it prints "no integrations enabled — the
  kit works fully with files" and exits 0.
- AC-INT-2.2 Given a second run with no changes, When sync runs, Then the dry-run shows zero creates.
- AC-INT-2.3 Given a task heading renamed, When sync runs, Then sync updates the link instead of creating a
  ticket.
- AC-INT-2.4 Given any sync run, When the trace is inspected, Then no transition, assignment,
  comment or mention call appears.

### REQ-INT-3: Degradation
A configured but unreachable integration makes `sync` exit 0 with
a warning; no other command reads integrations.
- AC-INT-3.1 Given an unreachable tracker, When sync runs, Then it exits 0 with a warning and
  writes nothing.

### REQ-INT-4: Eval with mocks
Eval cases use `evals/mocks/` stand-ins for tracker/wiki MCP
tools; no real server is contacted in CI.
- AC-INT-4.1 Given the eval suite, When it runs with default mocks, Then no real MCP server starts.

### REQ-INT-5: Discriminative setup and verification evals
The eval cases `setup-jira-confluence`, `setup-github-issues`, `setup-linear` and `verify-done`
are scored by deterministic graders (regex, file, tool trace) that fail when the plugin is absent.
The LLM graders of these cases are removed (see REMOVED). Regexes tolerate wording, e.g. `dry[- ]run`.
- AC-INT-5.1 Given a setup case run, When graded, Then the last message matches `/sdd:sync`.
- AC-INT-5.2 Given a setup case run, When graded, Then the last message matches `dry[- ]run`.
- AC-INT-5.3 Given a setup case run, When graded, Then `.sdd/config.yaml` contains no `kind:` entry (the scaffold seeds `integrations: {}`).
- AC-INT-5.4 Given the GitHub setup case run, When the trace is inspected, Then `gh auth status` was run.
- AC-INT-5.5 Given the verify-done case run, When graded, Then `docs/changes/*/verification.md` exists.
- AC-INT-5.6 Given the verify-done case run, When graded, Then that file names AC-1 and AC-2.
- AC-INT-5.7 Given the four cases run without the plugin, When graded, Then the graders of AC-INT-5.1, 5.2, 5.5 and 5.6 fail; the graders of AC-INT-5.3 and 5.4 are regression guards that must pass with the plugin. (Amended 2026-10-15 by the maintainer after the eval runs.)

## History
