## Why
`/sdd:init` left `test_single` unresolved for projects whose test script runs `node --test`, so
`/sdd:implement` had no command for its red and green runs. Found while adopting the kit in this
repository.

## Change
`detect` now proposes `node --test --test-name-pattern <Name>` for those projects. Change folder:
`docs/changes/20261015-detect-node-test-single/`.

## Proving test
`detect.test.mjs` › "node:test script gets a name-pattern single-test command" failed (`''`), then
passed after the fix (`sdd tdd red` / `sdd tdd green`). Full suite: 311 passed.
