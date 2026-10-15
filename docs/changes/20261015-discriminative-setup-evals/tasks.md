# Tasks: discriminative setup and verify-done evals

## T1: Explain sync before any check in the three setup skills
- Covers: AC-INT-1.1, AC-INT-1.2, AC-INT-1.3
- Expected paths: plugins/sdd/skills/setting-up-jira-confluence/SKILL.md, plugins/sdd/skills/setting-up-github-issues/SKILL.md, plugins/sdd/skills/setting-up-linear/SKILL.md, tools/**
- Outermost test: each setup skill names `/sdd:sync`, the dry run and "nothing is written before confirmation" before its first check, at repository test level (`npm test`), as a new structural test in `tools/` that parses each SKILL.md and fails first because the explanation sits in the last step; the existing no-secret and failed-connection-test behaviour (AC-INT-1.1, AC-INT-1.2) stays unchanged
- Depends on: none
- Package: .
- Status: done

## T2: Commit the deterministic setup graders
- Covers: AC-INT-1.4, AC-INT-5.1, AC-INT-5.2, AC-INT-5.3, AC-INT-5.4
- Expected paths: plugins/sdd/evals/setup-jira-confluence/graders/**, plugins/sdd/evals/setup-github-issues/graders/**, plugins/sdd/evals/setup-linear/graders/**
- Outermost test: the setup cases' graders match a run's last message, `.sdd/config.yaml` and tool trace, at eval level (`npm run eval:quick`); the `dry-run` grader is also created for github-issues and linear so AC-INT-5.2 holds in all three cases; only the run confirms that `gh auth status` is traceable in the sandbox
- Depends on: T1
- Package: .
- Status: todo

## T3: Commit the deterministic verify done graders
- Covers: AC-INT-5.5, AC-INT-5.6
- Expected paths: plugins/sdd/evals/verify-done/graders/**
- Outermost test: the verify-done case finds `verification.md` naming AC-1 and AC-2, at eval level (`npm run eval:quick`)
- Depends on: none
- Package: .
- Status: todo

## T4: Remove the LLM graders that pass without the plugin
- Covers: AC-1
- Expected paths: plugins/sdd/evals/setup-github-issues/graders/optional-and-confirm.md, plugins/sdd/evals/setup-jira-confluence/graders/own-server-env-creds.md, plugins/sdd/evals/setup-linear/graders/own-server.md, plugins/sdd/evals/verify-done/graders/no-evidence-no-go.md
- Outermost test: the four cases run with only their remaining graders and all pass, at eval level (`npm run eval:quick`)
- Depends on: T2, T3
- Package: .
- Status: todo

## T5: Show the deterministic graders fail without the plugin
- Covers: AC-INT-5.7
- Expected paths: docs/changes/20261015-discriminative-setup-evals/**
- Outermost test: the four cases run without the plugin fail the graders of AC-INT-5.1 to 5.6, at eval level (`npm run eval:quick`, then the same run with the plugin disabled); both results are recorded in `docs/changes/20261015-discriminative-setup-evals/verification.md`
- Depends on: T4
- Package: .
- Status: todo
