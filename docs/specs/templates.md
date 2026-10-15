# Spec: templates

Status: draft · Cites: K2 · ADRs: 0001, 0002

## Purpose
Short, consistent artifacts. Defaults ship in the plugin; projects override per template.

## Requirements

**REQ-TPL-1 — Catalogue and budgets.** Each template declares `max_lines` in frontmatter (code blocks,
contracts and HTML comments excluded). Validation warns above the budget and fails above 1.5×.

| Template | Route | Budget | Required sections |
|---|---|---|---|
| `brief.md` | quick | 15 | Problem · Expected behaviour · Proving test |
| `functional.md` | full | 120 | Problem · Scope · Out of scope · Acceptance criteria · Open questions |
| `delta.md` | standard | 120 | Why · Reuse · ADDED · MODIFIED · REMOVED · Acceptance criteria · Open questions |
| `technical.md` | full | 250 | Reuse · Contracts · Rules · Decisions · Migration · Observability · Living spec deltas · Open questions |
| `tasks.md` | standard, full | 12 tasks | `T<n>` blocks |
| `plan.md` | autopilot lane B | 60 | Task · Approach · Files · Risks · Tripwires fired |
| `adr.md` | full | 60 | Context · Decision · Consequences · Rejected alternatives |
| `test-plan.md` | standard, full | 120 | Cases table |
| `verification.md` | standard, full | 80 | Commands run · Criterion evidence · Not verified locally · Verdict |
| `pr.md` | standard, full | 80 | Why · Behaviour change · Review focus · Criteria · Evidence · To confirm |
| `pr-quick.md` | quick | 20 | Why · Change · Proving test |
| `living-spec.md` | archive, adopt | 200 | Purpose · Requirements · History |
| `constitution.md` | init | 40 | Invariants table |
| `seed-rules.md` | init | — | Rule groups (`# Group` headings) |
| `agents-section.md` | init | 40 | Marked section for `AGENTS.md` |
| `ci/sdd-validate.yml` | init | — | GitHub Actions workflow |

- AC-TPL-1.1 Given a `brief.md` with 20 counted lines, When `sdd validate` runs, Then it warns
  V-SIZE; given 23 lines, Then it fails.

**REQ-TPL-2 — Override resolution.** `.sdd/templates/<name>` wins over the plugin default and must
keep the required headings; extra sections are allowed.
- AC-TPL-2.1 Given an override of `functional.md` without "Out of scope", When `sdd validate` runs,
  Then it fails with V-SECTIONS naming the override.

**REQ-TPL-3 — Writing rules** embedded as HTML comments in every template: link to code instead of
copying it; one fact in one place; omit empty optional sections; never "N/A"; Migration and
Observability always present and may say "None".
- AC-TPL-3.1 Given any default template, When `sdd validate --templates` runs, Then it contains the
  writing-rules comment and its required headings.

**REQ-TPL-4 — Stable headings.** `## T<n>: <imperative>` and `### REQ-<CAP>-<n>: <title>` with no
punctuation besides the colon.
- AC-TPL-4.1 Given a heading `## T2: Add /cancel endpoint`, When `sdd validate` runs, Then it fails
  V-HEADING.

**REQ-TPL-5 — Language.** Templates are English; generated content follows `language` in config.
