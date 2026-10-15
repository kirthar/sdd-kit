# Workflow

How a change moves through `sdd`, from setup to merge. Approvals are the person's own commands;
the hooks enforce them, and every irreversible action is handed back to the person.

```mermaid
sequenceDiagram
    autonumber
    actor P as Person
    participant C as Claude
    participant H as Hooks (guard, gate)
    participant S as sdd CLI
    participant R as Repo (docs, .sdd)
    participant G as Forge (GitHub)

    P->>C: /sdd:init
    C->>S: doctor + init plan
    S-->>C: detected stack and proposed config
    C-->>P: config, constitution, files to write
    P->>C: confirm
    C->>S: init --apply
    S->>R: .sdd/config.yaml, rules.md, AGENTS.md

    P->>C: "Guests should be able to cancel a booking"
    C->>C: sdd:new classifies the route from risk signals
    C->>S: new {slug} --route standard
    S->>R: docs/changes/{id}/state.yaml (no approvals yet)
    C-->>P: proposed route and reasons
    P->>S: /sdd:approve {id} route
    Note over P,S: Approvals run inside the person's command, never as a Claude tool call

    alt quick
        Note over C,R: brief.md only. No spec, no tasks.
    else standard or full
        opt full
            C->>R: functional.md (clarification sweep, AC-n criteria)
            C-->>P: review functional spec
            P->>S: /sdd:approve {id} functional
        end
        C->>C: sdd-researcher finds reuse and duplicates
        C->>R: delta.md, or technical.md + contracts + ADR
        C->>S: validate
        C-->>P: review spec
        P->>S: /sdd:approve {id} spec
        C->>R: tasks.md (T1..Tn, each covers criteria)
        C->>S: validate (every criterion has a task)
        C-->>P: review tasks
        P->>S: /sdd:approve {id} tasks
    end

    loop every small step of every task
        C->>H: Edit source file
        H->>R: active change approved for its route?
        H-->>C: allow (or block and name the missing approval)
        C->>S: tdd red -- {single test}
        S-->>C: fails for the expected reason
        C->>S: tdd green -- {single test}
        S-->>C: passes
        C->>C: refactor, commit explicit paths
    end

    C->>S: /sdd:verify runs validate, lint and tests
    C->>R: verification.md (criterion to evidence, GO or NO-GO)
    C->>S: scan --diff (secrets)
    C->>G: push branch, gh pr create --draft
    C->>H: gh pr merge or git push --force
    H-->>C: blocked, with "! {command}" for the person
    G-->>P: draft pull request
    P->>G: review, mark ready, merge
    P->>S: /sdd:archive {id}
    S->>R: deltas into docs/specs, change folder to archive
```

## Reading the diagram

| Step | Who acts | What enforces it |
|---|---|---|
| Route, functional, spec and tasks approvals | Person (`/sdd:approve`) | `gate` blocks code edits until they exist; `guard` blocks `sdd approve` from Claude |
| Spec and tasks quality | Claude, then reviewer subagents | `sdd validate` (sections, size, Given/When/Then, traceability, OpenAPI) |
| Test-first steps | Claude | `sdd tdd red/green` records each run; `/sdd:verify` checks red came before green |
| Push, PR, merge | Claude opens a draft; the person merges | `guard` blocks merge, approve, reviewers, force push and history rewrites |
| Living specs | Person runs `/sdd:archive` after merge | Deterministic merge of ADDED / MODIFIED / REMOVED; unknown targets fail |

`/sdd:status` shows where any change is in this flow and the next command. When Claude makes a
mistake, `/sdd:learn` turns it into a rule that every step above reads first.
