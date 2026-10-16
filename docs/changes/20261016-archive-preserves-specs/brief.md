# Brief: archive preserves living specs it does not change

## Problem
`sdd archive` (`plugins/sdd/scripts/lib/archive.mjs`) re-renders every living spec, strips HTML comments inside inline code, and treats headings inside fenced code as real headings; archiving one change corrupted three unrelated specs in this repository.

## Expected behaviour
Only specs that receive an ADDED, MODIFIED or REMOVED requirement are written; fenced code and inline HTML comments are kept byte for byte; `sdd validate` (V-DELTA) rejects a MODIFIED requirement that drops acceptance criteria the living spec has (scope added by the maintainer).

## Proving test
An archive test with a fenced block containing `## ` lines and an inline `<!-- -->` in another spec: both specs are unchanged after archiving an unrelated delta, and the delta lands (module level).
