# Rules

## R1: Never rewrite published history
- Why: force pushes and amends break review anchors and lose other people's work.
- How to apply: add a new commit; if history must change, hand the exact command to the person.
- Added: 2026-10-15

## R2: Stage explicit paths only
- Why: wildcard staging sweeps in local secrets and generated files.
- How to apply: list each path in git add; check git status before committing.
- Added: 2026-10-15

## R3: Keep pull requests small, self-contained and draft until verified
- Why: large or entangled pull requests cannot be reviewed or reverted on their own.
- How to apply: open as draft with an explicit base; mark ready only after a GO verification; stack only slices of the same change, each releasable alone.
- Added: 2026-10-15

## R4: Write the failing test first
- Why: code written before its test is never proven to be what makes the test pass.
- How to apply: one failing test for the expected reason, minimum code, then refactor and commit.
- Added: 2026-10-15

## R5: Never present a partial green as a full green
- Why: overstated confidence hides untested gaps.
- How to apply: report the exact commands run and say what only CI confirms.
- Added: 2026-10-15

## R6: Format before testing and leave a clean tree
- Why: formatters rewrite files, so what was tested must be what is committed.
- How to apply: run format and lint first, commit their changes, then test, then check git status.
- Added: 2026-10-15

## R7: Read the root cause before calling a failure environmental
- Why: one malformed fixture can look exactly like a missing service.
- How to apply: open the first error of a failing suite before blaming the environment.
- Added: 2026-10-15

## R8: Verify behaviour by exercising it
- Why: reading code is not evidence that it works.
- How to apply: every acceptance criterion needs a passing test or an observed run.
- Added: 2026-10-15

## R9: Fix the rule everywhere it lives
- Why: the same defect usually exists in every place that implements the rule.
- How to apply: after a fix, search for the other implementations and sibling changes.
- Added: 2026-10-15

## R10: Never put local paths or secrets in shared text
- Why: they leak machine details and credentials into public records.
- How to apply: use repository-relative paths; report a secret's rule and location, never its value.
- Added: 2026-10-15

## R11: Never credit an AI assistant in commits or pull requests
- Why: authorship belongs to the person who answers for the change.
- How to apply: no AI co-author trailer and no "Generated with" line; the author may sign.
- Added: 2026-10-16
