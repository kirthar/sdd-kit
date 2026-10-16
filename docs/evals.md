# Evals

Model-backed evals live in `plugins/sdd/evals/` (format: `claude plugin eval`). Each case builds a
small neutral project with `evals/_shared/repo.sh <variant>` as its scaffold, then sends one prompt.

| Group (tag) | What it proves |
|---|---|
| `activation` | Each auto skill fires from natural phrasing and produces its artifact |
| `negative` | No `sdd` skill fires for unrelated requests; the agent cannot approve on the person's behalf |
| `routes` | `quick` produces a brief and no spec; `full` is proposed for a new public contract |
| `hooks` | `guard` blocks force push and amend with a hand-off command; `gate` blocks code without an approved change |
| `no-integrations` | Everything works with no wiki or tracker configured |

Skill-activation graders (`tool_used: Skill`) are unscored indicators under the default
with/without-plugin ablation; scored graders check artifacts, traces and files, so the reported
improvement is the plugin's behavioural effect.

## Running
- Full run (3 runs per case, both arms): `npm run eval`
- Cheap run (1 run, Sonnet, 4 in parallel): `npm run eval:quick`
- One case: `npm run eval:quick -- --case hook-force-push`

Runs use the signed-in Claude account (subscription usage). They are not part of the pull-request
CI; run them manually or from the scheduled workflow.

## Results: 0.2.0 (2026-10-16)

20 cases, 3 runs per case, Sonnet, with and without the plugin.

| | With plugin | Without plugin | Mean delta |
|---|---|---|---|
| 0.2.0 | **0.917** | 0.353 | **+0.564** |

| Case | With | Without | Δ | Skill fired |
|---|---|---|---|---|
| hook-amend | 1.00 | 0.00 | +1.00 | n/a |
| hook-force-push | 0.33 | 0.33 | +0.00 | n/a |
| hook-gate-no-change | 1.00 | 0.00 | +1.00 | n/a |
| implement-quick-tdd | 1.00 | 0.67 | +0.33 | 3/3 |
| init-constitution-path | 0.67 | 0.50 | +0.17 | n/a |
| neg-agent-cannot-approve | 0.56 | 0.22 | +0.33 | n/a |
| neg-explain-code | 1.00 | 1.00 | +0.00 | 3/3 |
| neg-git-log | 1.00 | 1.00 | +0.00 | 3/3 |
| new-full-feature | 1.00 | 0.25 | +0.75 | 3/3 |
| new-quick-typo | 1.00 | 0.33 | +0.67 | 3/3 |
| pr-without-forge | 1.00 | 0.50 | +0.50 | 3/3 |
| setup-github-issues | 1.00 | 0.42 | +0.58 | 3/3 |
| setup-jira-confluence | 1.00 | 0.50 | +0.50 | 3/3 |
| setup-linear | 1.00 | 0.33 | +0.67 | 3/3 |
| spec-standard-delta | 1.00 | 0.00 | +1.00 | 3/3 |
| status-next-step | 1.00 | 0.50 | +0.50 | 3/3 |
| sync-no-integrations | 1.00 | 0.50 | +0.50 | n/a |
| tasks-from-approved-spec | 1.00 | 0.00 | +1.00 | 3/3 |
| test-plan | 1.00 | 0.00 | +1.00 | 3/3 |
| verify-done | 0.78 | 0.00 | +0.78 | 3/3 |

Reading the results
- Every auto skill fired when it should (all "Skill fired" indicators 3/3), and no `sdd` skill fired
  for unrelated requests.
- `hook-amend` and `hook-gate-no-change` blocked in every run; without the plugin the agent amended
  and edited code.
- `hook-force-push` (0.33) and `init-constitution-path` (0.67) are limited by the eval sandbox on
  macOS, where the system git wrapper cannot run: the agent checks git first and stops before the
  push the guard would block, and `doctor` reports git as missing. Both pass where git runs.
- `neg-agent-cannot-approve` (0.56): in one of three runs an approval was written to `state.yaml`
  without a person. The trace was not kept and nine further runs did not reproduce it. The guard now
  blocks every known shell route to that file (`20261016-guard-state-writes`).
- `verify-done` (0.78) uses deterministic graders since 0.2.0; one run did not write
  `verification.md`.
- The setup and verify cases no longer use model-judged graders that also passed without the plugin.

## History

Earlier measurements, kept for comparison. Suites and graders changed between them, so the numbers
are not directly comparable.

| Date | Version | Cases × runs | With | Without | Delta | Notes |
|---|---|---|---|---|---|---|
| 2026-10-15 | 0.1.0 | 19 × 3 | 0.988 | 0.390 | +0.598 | Setup and verify cases still had model-judged graders |
| 2026-10-15 | pre-release baseline | 19 × 1 | 0.482 | 0.364 | +0.118 | Skill descriptions only, no skill bodies or hooks; measured before implementation |
