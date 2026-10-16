# Spec: learned rules and shared context

Status: current · Cites: K3, K4 · ADRs: 0003

## Purpose
Turn each agent mistake into a durable, generic rule that every command reads.

## Requirements

### REQ-RULE-1: Rules file format
Format of `.sdd/rules.md`.

```markdown
## R<n>: <imperative rule, one line>
- Why: <the failure it prevents, generic>
- How to apply: <when it triggers and what to do>
- Added: <yyyy-mm-dd>
```
IDs are never reused; retired rules move to `## Retired` with a reason.
- AC-RULE-1.1 Given two rules with the same ID, When `sdd validate` runs, Then V-RULES fails.

### REQ-RULE-2: Learn a rule
`/sdd:learn <what went wrong>` (user-only). At most two clarifying questions; then a
generic rule (no names, paths, hosts, ticket IDs, customers or domain specifics); overlap check
against existing rules (amend instead of duplicating); a suggestion for the strongest mechanism that
could enforce it (validator rule, hook shape, template change). Writes after confirmation.
- AC-RULE-2.1 Given a description containing an absolute path and a person's name, When learn
  proposes a rule, Then the rule contains neither and V-LEAK passes.
- AC-RULE-2.2 Given an existing rule with the same intent, When learn runs, Then it proposes amending
  that rule.

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

### REQ-RULE-4: Seed rules
`templates/seed-rules.md` ships the kit's generic learned rules in
groups; init offers each group.
- AC-RULE-4.1 Given the seed file, When `sdd validate --templates` runs, Then it passes V-RULES and
  V-LEAK.

## History
