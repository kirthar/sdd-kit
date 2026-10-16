# Brief: detect the single-test command for node:test

## Problem
`detect` in `plugins/sdd/scripts/lib/detect.mjs` sets `test_single` only for vitest and jest, so a
`node --test` project (including this repository) gets it unresolved during `/sdd:init`.

## Expected behaviour
A Node package whose test script runs `node --test` gets `test_single: node --test --test-name-pattern <Name>`.

## Proving test
A detect unit test with a `node --test` script asserts that single-test command (module level).
