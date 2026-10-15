# Requirements lint

Check every requirement and criterion against these principles. Report Blocking / Warning / Pass.

1. **Clear** — one reading only; no "fast", "easy", "appropriate" without a number or example.
2. **Complete** — actor, trigger, outcome and the non-happy paths are stated.
3. **Consistent** — no contradiction with other requirements, living specs or the constitution.
4. **Atomic** — one behaviour per item; split anything joined by "and/or".
5. **Testable** — an observer can tell pass from fail.
6. **Traceable** — has an ID and links to the problem it serves.
7. **Feasible** — nothing in the code or constraints makes it impossible as written.
8. **Prioritised** — must / should / could is clear when scope is negotiable.
9. **No solution bias** — states behaviour, not implementation (unless the contract is the point).
10. **Active voice** — the actor is explicit.

Acceptance criteria
- `AC-<n> Given <context>, When <action>, Then <observable outcome>.` One outcome per criterion.
- Never "or" inside a Given; split it. No tautologies: the Then must be able to fail.
- A state change needs an independently observable confirmation (reload and see it).
- Formulas carry worked numbers, including boundary values.
- Use an examples table only for 3+ cases with identical steps.
- Derive the non-happy paths yourself; write explicit out-of-scope criteria when testers could assume them.
- When regenerating criteria, re-derive from the requirements; an older criteria list is not a source of facts.
