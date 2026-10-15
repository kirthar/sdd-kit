# Rules

## R1: Do not write a technical plan while a BLOCKING question is open
- Why: confident design built on an unasked question ships as a defect nobody can trace.
- How to apply: when unsure whether a question blocks, treat it as BLOCKING and ask.
- Added: 2026-10-15

## R2: Ask only where the docs and the code are silent
- Why: re-asking answered questions teaches people to ignore clarification.
- How to apply: search docs, living specs and code before every question; ask at most four at a time with options.
- Added: 2026-10-15

## R3: Keep one fact in one place
- Why: restated facts drift apart and the documents contradict each other.
- How to apply: contracts are the source of truth; link upstream documents and code instead of copying them.
- Added: 2026-10-15

## R4: Turn vague requirements into questions
- Why: silently repaired requirements move ownership and hide disagreement.
- How to apply: never rewrite an acceptance criterion you do not own; raise it as an open question.
- Added: 2026-10-15

## R5: Scope a rule at the comparison, not by removing input
- Why: dropping items from a shared input erases signals other consumers rely on.
- How to apply: filter at the point where the rule compares values; make filters fail safe when nothing matches.
- Added: 2026-10-15

## R6: Write the failing test first
- Why: code written before its test is never proven to be what makes the test pass.
- How to apply: one failing test for the expected reason, minimum code, then refactor and commit.
- Added: 2026-10-15

## R7: Never present a partial green as a full green
- Why: overstated confidence hides untested gaps.
- How to apply: report the exact commands run and say what only CI confirms.
- Added: 2026-10-15

## R8: Format before testing and leave a clean tree
- Why: formatters rewrite files, so what was tested must be what is committed.
- How to apply: run format and lint first, commit their changes, then test, then check git status.
- Added: 2026-10-15

## R9: Read the root cause before calling a failure environmental
- Why: one malformed fixture can look exactly like a missing service.
- How to apply: open the first error of a failing suite before blaming the environment.
- Added: 2026-10-15
