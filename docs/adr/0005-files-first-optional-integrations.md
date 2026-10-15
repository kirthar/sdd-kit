# ADR-0005: Files first, integrations optional

Status: accepted · Cites: K1, K7

## Context
Process tooling tied to a tracker or wiki fails for teams that use another one, and leaks
servers and account details into shared code.

## Decision
- Specs, ADRs, tasks and verification live in the repo next to the code. Tasks default to
  `docs/changes/<id>/tasks.md`; the kit is complete with no integration.
- Integrations (wiki, issue trackers) are opt-in through setup skills that guide the user to
  configure **their own** MCP server or CLI, store credentials in environment variables or their
  secret manager, test the connection, then enable it in `.sdd/config.yaml`:

  ```yaml
  integrations:
    tracker: { kind: jira | github | linear, project: <user value>, write: confirm }
    docs:    { kind: confluence, parent: <user value>, write: confirm }
  ```
- `/sdd:sync` is the only command that writes outside the repo: dry-run, confirmation, idempotent
  apply (stable markers), one write verified before scaling. Remote copies are link-backs to the
  repo files, which stay the source of truth.
- If an integration is configured but unreachable, `sync` reports it and exits non-fatally; no
  other command depends on it.

## Consequences
- No hostnames, project keys or tokens ever appear in the kit; examples use `<placeholders>`.
- The "works with no integration" property is covered by an eval.

## Rejected alternatives
- Tracker as source of truth: specs drift from code and require network access to plan.
