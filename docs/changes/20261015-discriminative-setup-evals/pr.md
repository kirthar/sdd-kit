## Why
The three setup skills explain `/sdd:sync` only in their last step, so a setup that stops early (no MCP server, failed connection test) never tells the person what enabling the integration gives them. The setup and verify-done eval cases were also judged by LLM graders that pass without the plugin, so a pass did not show the plugin did anything.

Change: `docs/changes/20261015-discriminative-setup-evals/` (standard, `delta.md`).

**Status: GO (after amendment) on AC-INT-5.7, pending the maintainer's decision.** See Criteria.

## Behaviour change
- **Before:** `setting-up-jira-confluence`, `setting-up-github-issues` and `setting-up-linear` name `/sdd:sync` in their last step. **After:** each states, before its first check, that `/sdd:sync` mirrors specs and tasks after a dry run and that nothing is written before confirmation. The person sees this on every exit path.
- **Before:** the setup and verify-done eval cases rely on LLM graders that also pass without the plugin. **After:** they are scored by deterministic graders (regex, file, tool trace). The four LLM graders that passed without the plugin are removed.
- The verify-done case may now use `Write` and `Edit`, so `verification.md` can be written and graded.

## Review focus
- Grader strictness: the config graders match `kind:\s*<provider>`, not any `kind:` entry as AC-INT-5.3 and AC-INT-1.4 are worded. A different `kind:` value would pass. Decide whether to widen to `kind:`.
- The AC-INT-5.7 gap below.
- `plugins/sdd/skills/setting-up-*/SKILL.md`: the explanation moves ahead of step 1; the existing step 5 text is reused.

## Criteria
Covered, with evidence in `verification.md`:
- AC-INT-1.3, AC-INT-1.4, AC-INT-5.1, AC-INT-5.2, AC-INT-5.3, AC-INT-5.4, AC-INT-5.5, AC-INT-5.6: pass with the plugin.
- AC-INT-1.1, AC-INT-1.2: behaviour unchanged; no new test (no eval covers a failed connection test).

Open:
- **AC-INT-5.7 (fail as written).** Without the plugin, `names-sync`, `dry-run`, `verification-written`, `names-missing-criteria` and the verdict grader fail, as required. But `no-write-before-confirmation` passes without the plugin in every run (nothing writes the config), and `checks-gh-auth` passes without it in 3 of 4 runs. They guard against regressions; they do not discriminate.
- **AC-1: partial**, because it depends on AC-INT-5.7.
- Proposed amendment, needs the maintainer's decision and recorded approval: AC-INT-5.7 covers only the `/sdd:sync`, dry-run and verification graders; AC-INT-5.3 and 5.4 stay as guards that must pass with the plugin. The alternative is to make those two graders discriminate.

## Evidence
- `node plugins/sdd/scripts/sdd.mjs validate --all`: ok
- `npm test`: 325 passed, 0 failed
- `claude plugin eval . --runs 1 --model sonnet --case <setup-*|verify-done>`: each case with and without the plugin (results in `verification.md`)
- `node plugins/sdd/scripts/sdd.mjs scan --diff main`: no secrets found
- Only the release eval run confirms three runs per case; I ran one per case.
- Not run: push and `gh pr create` (the maintainer pushes after review).

## To confirm
- [ ] Product: AC-INT-5.7: amend as proposed, or make the config and `gh auth` graders discriminate?
- [ ] QA: run the release eval run (3 runs per case) and check `checks-gh-auth` (it passed without the plugin in 3 of 4 runs).
- [ ] Developers: widen the config graders to any `kind:` entry?
- [ ] Developers: do the remaining LLM graders (`skill-*`, `no-secret-in-repo`) pass without the plugin?

## Beyond the task
- `plugins/sdd/evals/verify-done/prompt.md` allows `Write` and `Edit`. It is outside every task's Expected paths; AC-INT-5.5 cannot pass without it. Add it to T3's Expected paths, or revert.
- `tools/test.mjs` now also runs `tools/*.test.mjs` (within T1's `tools/**`). The new `tools/setup-graders.test.mjs` belongs to T2, whose Expected paths omit `tools/**`; it checks grader file text only.
- T5 is marked `done` while the verdict is NO-GO.
