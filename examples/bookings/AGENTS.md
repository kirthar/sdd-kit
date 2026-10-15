<!-- sdd:begin -->
## Spec-driven development (sdd)

This repository follows spec-driven development. Specs, tasks and decisions live in files:
`docs/specs/` (current behaviour), `docs/changes/<id>/` (changes in flight), `docs/adr/`.

Routes, chosen per change and confirmed by a person:
- **quick** — bug or small change: `brief.md`, a failing test first, a short PR. No spec.
- **standard** — change to existing behaviour: `delta.md` → `tasks.md` → implementation.
- **full** — new capability: `functional.md` → `technical.md` + OpenAPI contracts + ADRs → `tasks.md`.

Rules every agent follows:
1. No code edits without an active change whose route (and, for standard/full, spec and tasks)
   a person approved. Approvals are recorded only by the person.
2. Tests first: a failing test for the expected reason, the minimum code, refactor, commit.
3. Format and lint before tests; report exact commands; leave a clean tree.
4. Never force push, amend published commits, delete branches, merge, approve or request reviewers.
   When one of these is needed, give the exact command to the person.
5. Pull requests open as drafts with an explicit base and a behaviour-first description.
6. Read `.sdd/constitution.md` and `.sdd/rules.md` before planning or coding.

Validate anytime: `sdd validate --all` (the `sdd` CLI ships with the plugin).
<!-- sdd:end -->
