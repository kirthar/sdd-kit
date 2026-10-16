# Pull request description

Behaviour first; never a file-by-file changelog. With squash merges (`pr.merge: squash`) the
title and this body become the squash commit on the base branch, so write them for the history:
the title is a conventional subject naming the behaviour, not the branch.

1. **Why** — the problem and who has it (link the change folder, not a copy of it).
2. **Behaviour change** — before → after, as a user or caller observes it.
3. **Review focus** — the riskiest parts and why; where a reviewer should spend time.
4. **Criteria** — covered criteria with their evidence; out-of-scope criteria with their owner.
5. **Evidence** — exact commands run and results; what only CI confirms.
6. **To confirm** — a checklist per role (product, QA, other developers).
7. **Beyond the task** — any refactor or deviation from the plan, and why.

Rules: no absolute local paths, no secrets, no @mentions, no AI attribution (no AI co-author, no
"Generated with" line). Open as draft with an explicit base; mark ready after a GO verification
when `pr.auto_ready`.
