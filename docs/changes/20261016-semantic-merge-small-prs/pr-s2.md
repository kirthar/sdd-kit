Slice 2 of 2 · previous: #12

## Why
Large changes reached review as one large pull request, which reviewers skim instead of read.
This slice of `docs/changes/20261016-semantic-merge-small-prs/` gives the kit a review budget and
ships a change that exceeds it as small stacked pull requests, without adding prompts.

## Behaviour change
- **Before:** one pull request per change, whatever its size.
- **After:**
  - `sdd size [--base <ref>]` counts reviewable lines (source only; `pr.size_exclude` skips docs,
    tests, lockfiles, vendored code) against `pr.max_lines` (400) and says `within` or `over`.
  - Tasks may carry `Slice: S<n>`; V-SLICE requires all-or-none, S1… contiguous, no dependency on
    a later slice.
  - `/sdd:tasks` slices a change predicted over budget; `/sdd:implement` builds S<k> on
    `sdd/<id>-s<k>` from the slice below; `/sdd:verify` checks the slice's criteria; `/sdd:pr`
    opens a stacked pull request per slice (`pr-s<k>.md`), marks it ready, restacks after a lower
    slice merges, and asks for `## Size` when a slice is over budget.
  - V-ATTRIBUTION now checks every slice body. ADR-0009; R3 / seed R8 allow stacking only within a
    change.

## Review focus
- `plugins/sdd/scripts/lib/validate.mjs` `checkSlices`: ordering and dependency rules.
- `plugins/sdd/scripts/lib/size.mjs`: `<ref>...HEAD` numstat, binary skip, exclusion globs.
- `plugins/sdd/skills/pr/SKILL.md` restack steps: merge base into the next slice, then retarget.

## Criteria
Covered: AC-10 … AC-15 (see `verification.md`). AC-1 … AC-9 are in slice 1 (#12).

## Evidence
- `npm test` → 479 pass. `sdd validate --all` → exit 0. Manifests pass. Scan clean.
- Size of this slice: 152 counted, 202 excluded, budget 400 — within.
- This change is itself sliced (T1–T4 in S1, T5–T8 in S2) and stacked on #12.

## To confirm
- [ ] Merge #12 first; this pull request then retargets to `main` (branches delete on merge).
- [ ] Maintainers: 400 lines and the default exclusions fit how the kit is reviewed.
