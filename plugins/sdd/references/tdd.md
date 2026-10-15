# Test-first implementation

Strict mode (`testing.tdd: strict`, the default) is not optional.

## The loop (repeat in small steps)
1. Write **one** failing test for the next small behaviour, starting from the outermost layer named
   in the task (acceptance, handler, page, contract) and moving inward only when needed.
2. Run it through `sdd tdd red -- <single-test command>`. It must fail **for the expected reason**
   (an assertion about the missing behaviour — not a typo, import or wiring error).
3. Write the minimum code that makes it pass. No speculative abstractions, no unrelated cleanup.
4. Run `sdd tdd green -- <single-test command>`.
5. Refactor with the tests green. Commit (one behaviour per commit, staged by explicit path).

## Choosing the layer
Pick the lowest layer that genuinely proves the criterion; reuse the repository's existing test
helpers, builders and doubles before creating new ones.

## Test doubles (`testing.doubles: explicit`)
Prefer real wiring. When a double is needed, write an explicit one named by role (stub, fake, spy)
instead of auto-mocking. Mock only at boundaries you do not own (network, clock, randomness).

## Before saying done
1. Run format and lint first (they rewrite files) and commit their changes.
2. Run the configured test command; report the exact command and its result.
3. The working tree is clean. Say what only CI can confirm (other suites, coverage gates).
4. Coverage gates are met by adding tests, never by lowering thresholds.

## Refactoring existing code
Characterise before changing: pin current behaviour with tests, never edit existing tests while
adding the harness, and prove a test can fail by mutating the code once and reverting.
