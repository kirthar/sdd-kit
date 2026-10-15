---
template: seed-rules
required: []
---
# Specs

## R1: Do not write a technical plan while a BLOCKING question is open
- Why: confident design built on an unasked question ships as a defect nobody can trace.
- How to apply: when unsure whether a question blocks, treat it as BLOCKING and ask.

## R2: Ask only where the docs and the code are silent
- Why: re-asking answered questions teaches people to ignore clarification.
- How to apply: search docs, living specs and code before every question; ask at most four at a time with options.

## R3: Keep one fact in one place
- Why: restated facts drift apart and the documents contradict each other.
- How to apply: contracts are the source of truth; link upstream documents and code instead of copying them.

## R4: Turn vague requirements into questions
- Why: silently repaired requirements move ownership and hide disagreement.
- How to apply: never rewrite an acceptance criterion you do not own; raise it as an open question.

## R5: Scope a rule at the comparison, not by removing input
- Why: dropping items from a shared input erases signals other consumers rely on.
- How to apply: filter at the point where the rule compares values; make filters fail safe when nothing matches.

# Git

## R6: Never rewrite published history
- Why: force pushes and amends break review anchors and lose other people's work.
- How to apply: add a new commit; if history must change, hand the exact command to the person.

## R7: Stage explicit paths only
- Why: wildcard staging sweeps in local secrets and generated files.
- How to apply: list each path in git add; check git status before committing.

## R8: Keep pull requests self-contained and draft
- Why: chains of dependent pull requests cannot be reviewed or reverted on their own.
- How to apply: open as draft with an explicit base; never stack on unfinished work.

# Testing

## R9: Write the failing test first
- Why: code written before its test is never proven to be what makes the test pass.
- How to apply: one failing test for the expected reason, minimum code, then refactor and commit.

## R10: Never present a partial green as a full green
- Why: overstated confidence hides untested gaps.
- How to apply: report the exact commands run and say what only CI confirms.

## R11: Format before testing and leave a clean tree
- Why: formatters rewrite files, so what was tested must be what is committed.
- How to apply: run format and lint first, commit their changes, then test, then check git status.

## R12: Read the root cause before calling a failure environmental
- Why: one malformed fixture can look exactly like a missing service.
- How to apply: open the first error of a failing suite before blaming the environment.

# Review

## R13: Verify behaviour by exercising it
- Why: reading code is not evidence that it works.
- How to apply: every acceptance criterion needs a passing test or an observed run.

## R14: Fix the rule everywhere it lives
- Why: the same defect usually exists in every place that implements the rule.
- How to apply: after a fix, search for the other implementations and sibling changes.

## R15: Never put local paths or secrets in shared text
- Why: they leak machine details and credentials into public records.
- How to apply: use repository-relative paths; report a secret's rule and location, never its value.
