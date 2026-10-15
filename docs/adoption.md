# Adopting sdd in an existing project

You do not need to document the whole system before starting.

1. `/sdd:init` — config, constitution (invariants observed in your code, each with evidence), rules.
   Choose seed rule groups if you want a head start.
2. Start using routes for new work immediately. A `quick` change needs no living spec at all.
3. When a `standard` change touches a capability without a living spec, run
   `/sdd:adopt <capability>` first. The researcher drafts `docs/specs/<capability>.md` from the code
   with `status: unverified`, linking every requirement to the files that implement it.
4. **A person verifies each drafted spec** — correcting it to describe what the code really does —
   and changes `status` to `verified`. `sdd validate` warns about unverified specs until then.
5. From then on, deltas keep that spec current; nobody edits living specs by hand.

Tips
- Adopt per capability, at most three per run, starting where changes happen most.
- Unexpected behaviour found while adopting is documented as-is; fix it with its own change.
- Set `gates.exempt` for generated folders the gate should never block.
