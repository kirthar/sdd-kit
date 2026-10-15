# Contributing

Changes to the kit follow its own process: a change under `docs/` (spec delta or ADR), tests first,
a draft pull request.

## Development
```bash
npm test            # node:test suites for scripts and hooks (no dependencies)
npm run validate    # claude plugin validate for the marketplace and the plugin
npm run eval:quick  # model-backed evals, one run each (uses your Claude account)
```

## Skills
- `name`: lowercase with hyphens; never "claude" or "anthropic".
- `description`: third person; what it does **and** when to use it; it is the discovery contract.
- Body under 500 lines; details go to `references/` (one level deep); deterministic work goes to
  `scripts/` with tests.
- Start with `## Context` injecting `sdd context`; end with an explicit **Stop**.
- Skills that record approvals or write outside the repository are user-only
  (`disable-model-invocation: true`).
- Every new auto skill gets an activation eval and a "should not activate" case.

## Rules for content
No real organisations, people, hosts, tickets or credentials anywhere, including examples and
commit messages. Use `example.invalid`, `<placeholders>` and neutral domains. `sdd validate --all`
(V-LEAK) and the CI audit check this.
