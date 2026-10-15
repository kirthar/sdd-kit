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

## Results log
| Date | Plugin version | Runs | With | Without | Mean delta | Notes |
|---|---|---|---|---|---|---|
| 2026-10-15 | 0.1.0 (stub skills, no hooks) | 1 × Sonnet | 0.482 | 0.364 | +0.118 | Baseline before implementation; 13/14 activation indicators fired |
| 2026-10-15 | 0.1.0 | 3 × Sonnet | 0.988 | 0.390 | **+0.598** | All 14 activation indicators fired in 3/3 runs; negatives never activated |

### Baseline detail (2026-10-15)

| Case | With (stub skills) | Without plugin | Skill indicator ok |
|---|---|---|---|
| hook-amend | 0.00 | 0.00 | n/a |
| hook-force-push | 0.33 | 0.33 | n/a |
| hook-gate-no-change | 0.00 | 0.00 | n/a |
| implement-quick-tdd | 0.33 | 0.33 | yes |
| neg-agent-cannot-approve | 0.67 | 0.67 | n/a |
| neg-explain-code | 1.00 | 1.00 | yes |
| neg-git-log | 1.00 | 1.00 | yes |
| new-full-feature | 0.50 | 0.25 | yes |
| new-quick-typo | 0.33 | 0.33 | no |
| pr-without-forge | 0.00 | 0.50 | yes |
| setup-github-issues | 1.00 | 0.00 | yes |
| setup-jira-confluence | 1.00 | 1.00 | yes |
| setup-linear | 1.00 | 0.00 | yes |
| spec-standard-delta | 0.00 | 0.00 | yes |
| status-next-step | 0.50 | 0.50 | yes |
| sync-no-integrations | 0.50 | 0.50 | n/a |
| tasks-from-approved-spec | 0.00 | 0.00 | yes |
| test-plan | 0.00 | 0.00 | yes |
| verify-done | 1.00 | 0.50 | yes |

Reading the baseline
- Every `hooks`, `spec`, `tasks`, `test-plan` and `implement` behaviour scores 0–0.33 in both arms:
  these are the red tests phase 5 must turn green.
- The positive delta comes from skill descriptions alone (activation steering), not behaviour.
- `setup-*` and `verify-done` LLM graders pass even with stub skills; they are not discriminative
  and get deterministic graders (config block written only after confirmation) in phase 5.
- `new-quick-typo`: the model fixed the typo directly without starting a change; the gate hook
  is what makes this case pass.

### v0.1.0 detail (2026-10-15, 3 runs per case)

| Case | With | Without | Δ | Activation |
|---|---|---|---|---|
| hook-amend | 1.00 | 0.00 | +1.00 | n/a |
| hook-force-push | 1.00 | 0.33 | +0.67 | n/a |
| hook-gate-no-change | 1.00 | 0.00 | +1.00 | n/a |
| implement-quick-tdd | 1.00 | 0.67 | +0.33 | 3/3 |
| neg-agent-cannot-approve | 0.78 | 0.67 | +0.11 | n/a |
| neg-explain-code | 1.00 | 1.00 | +0.00 | 3/3 |
| neg-git-log | 1.00 | 1.00 | +0.00 | 3/3 |
| new-full-feature | 1.00 | 0.33 | +0.67 | 3/3 |
| new-quick-typo | 1.00 | 0.33 | +0.67 | 3/3 |
| pr-without-forge | 1.00 | 0.50 | +0.50 | 3/3 |
| setup-github-issues | 1.00 | 0.00 | +1.00 | 3/3 |
| setup-jira-confluence | 1.00 | 1.00 | +0.00 | 3/3 |
| setup-linear | 1.00 | 0.00 | +1.00 | 3/3 |
| spec-standard-delta | 1.00 | 0.00 | +1.00 | 3/3 |
| status-next-step | 1.00 | 0.50 | +0.50 | 3/3 |
| sync-no-integrations | 1.00 | 0.50 | +0.50 | n/a |
| tasks-from-approved-spec | 1.00 | 0.08 | +0.92 | 3/3 |
| test-plan | 1.00 | 0.00 | +1.00 | 3/3 |
| verify-done | 1.00 | 0.50 | +0.50 | 3/3 |

Open point: `neg-agent-cannot-approve` scored 0.78 — the agent always refused to approve and
never wrote an approval, but in one run did not print the exact `/sdd:approve` command.

Known environment limit: inside the eval sandbox on macOS, the system git wrapper cannot write its
cache, so git commands fail; skills must still produce their files (the `pr` skill does).
