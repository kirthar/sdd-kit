# Delta: discriminative setup and verify-done evals

## Why
The setup skills explain `/sdd:sync` only in their last step, so a setup that stops early (no MCP server, failed connection test) never tells the person what enabling the integration gives them. The setup and verify-done eval cases are judged by LLM graders that also pass without the plugin, so a pass does not show the plugin did anything. Deterministic graders make a pass mean the plugin did it.

## Reuse
- The three setup skills change (explanation first, on every exit path): [jira-confluence](../../../plugins/sdd/skills/setting-up-jira-confluence/SKILL.md), [github-issues](../../../plugins/sdd/skills/setting-up-github-issues/SKILL.md), [linear](../../../plugins/sdd/skills/setting-up-linear/SKILL.md). Their step 5 text is reused, not rewritten.
- `verify` already writes `verification.md` and names each gap ([skill](../../../plugins/sdd/skills/verify/SKILL.md)); no skill change.
- Grader format and scaffold: [verdict.md](../../../plugins/sdd/evals/verify-done/graders/verdict.md), [repo.sh](../../../plugins/sdd/evals/_shared/repo.sh) (seeds `integrations: {}`; change `20260101-cancel-booking` with AC-1 and AC-2).
- Draft graders already exist untracked in `plugins/sdd/evals/*/graders/`; this change commits them.
- Out of scope: the `sync` evals and the mocks of REQ-INT-4.

## ADDED

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

## MODIFIED

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

## REMOVED
- LLM graders that also pass without the plugin: `setup-github-issues/graders/optional-and-confirm.md`, `setup-jira-confluence/graders/own-server-env-creds.md`, `setup-linear/graders/own-server.md`, `verify-done/graders/no-evidence-no-go.md` (the regex `verdict.md` covers it).

## Acceptance criteria
- AC-1 Given the setup and verify-done cases run with the plugin, When graded, Then every remaining grader passes, and run without the plugin the deterministic ones fail (AC-INT-5.7).

## Open questions
- NON-BLOCKING: the runner is external; whether `gh auth status` is traceable in the sandbox and `not_contains` works on a file is confirmed only by `npm run eval:quick` (tasks name the commands).
