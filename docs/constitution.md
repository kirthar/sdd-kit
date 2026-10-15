# sdd kit — constitution

Invariants for the kit itself. Every spec, ADR and pull request in this repo cites the ones it
could break. Changing this file requires an ADR.

| ID | Invariant | Violated when |
|---|---|---|
| K1 | Files first | Any command needs an external service to complete its job |
| K2 | Proportional ceremony | A `quick` change produces a spec, or any artifact exceeds its template's size budget |
| K3 | Human owns every transition | The agent advances a phase, merges, approves or requests reviewers without a human act |
| K4 | Critical rules are enforced by tools | A rule marked critical exists only as prose (no hook, validator or CI check) |
| K5 | Stack agnostic | Plugin code assumes a language, build tool or framework, or requires a forge (a forge CLI is optional and degrades) |
| K6 | Neutral and public | The repo, including git history, names a real organization, customer, host, ticket or person (third-party license notices excepted) |
| K7 | No credentials, no servers | The kit ships a server address, token or account identifier |
| K8 | One runtime | A script or hook needs anything beyond Node.js and git (optional `npx` tools degrade gracefully) |
| K9 | Tests first | Plugin behaviour (scripts, hooks, validators) lands without a test that failed before it |
| K10 | Living specs | A merged change leaves `docs/specs/` describing something other than current behaviour |

Consequences for contributors
- New skills follow the authoring rules in `CONTRIBUTING.md` and ship activation evals.
- Every blocked action explains why and hands the exact command to the human to run.
- Breaking a config or file-layout contract requires a major version and a migration note.
