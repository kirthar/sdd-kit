# Spec: autopilot

Status: draft · Cites: K1, K3, K4 · ADRs: 0001, 0003

## Purpose
Advance already-approved work without a person at the keyboard, inside hard limits, leaving every
decision that belongs to a person to a person.

## Out of scope
Picking work from trackers; approving anything; merging; deploying.

## Requirements

**REQ-AUTO-1 — Opt-in and invocation.** `/sdd:autopilot` (user-only) refuses unless
`autopilot.enabled: true`. Intended to run headless from the person's scheduler
(`claude -p "/sdd:autopilot"`) with the permission list offered by init.
- AC-AUTO-1.1 Given `enabled: false`, When the pass starts, Then nothing runs and the message says
  how to enable it.

**REQ-AUTO-2 — Preflight (`sdd autopilot preflight`).** Kill switch `.sdd/local/pause`; pass lock
(atomic directory, heartbeat, stale after TTL — held means skip, never wait); git and forge auth;
required permissions present in settings; disk headroom; snapshot of the main checkout's status.
Any failure ⇒ report-only pass.
- AC-AUTO-2.1 Given a fresh lock held by another pass, When preflight runs, Then the pass ends with
  "skipped: locked" and exit 0.
- AC-AUTO-2.2 Given missing permissions, When preflight runs, Then the pass is report-only and the
  report lists the missing entries.

**REQ-AUTO-3 — Eligibility.** The change has `tasks` approved; the task is not done; its dependencies
are done; no BLOCKING open question in the change. Order: change age, then task order.
- AC-AUTO-3.1 Given T2 depending on an unfinished T1, When eligibility is computed, Then T2 is
  excluded with reason `depends-on T1`.

**REQ-AUTO-4 — Lanes.** Lane A unless a tripwire fires (monotone OR; unevaluable counts as fired):
Expected paths matching `tripwires.paths` or contract/schema folders, keywords in the task, more
than `tripwires.max_files` predicted files, more than one package. Lane B writes
`plans/T<n>.md` and waits for `/sdd:approve <id> plan:T<n>`.
- AC-AUTO-4.1 Given a task whose Expected paths include `contracts/`, When routed, Then a plan is
  written and no worktree is created.

**REQ-AUTO-5 — Execution.** Per task: worktree from `base_branch` under `worktree_root` with the
active pointer set; `sdd-implementer` (strict TDD, commits, never pushes); compare the main checkout
with the snapshot (escape ⇒ push nothing, revert nothing, report); format → commit → tests → clean
tree; tripwires re-evaluated on the actual diff (fired ⇒ stop before push); `sdd scan`; push the
branch; draft PR with explicit base; CI polled within budget; one repair on a real failure.
Multi-package tasks go through `sdd-coordinator`.
- AC-AUTO-5.1 Given the implementer writes to the main checkout, When the step ends, Then nothing
  is pushed and the report flags the escape.
- AC-AUTO-5.2 Given a successful task, When the pass ends, Then exactly one draft PR exists for it
  and it has no reviewers.

**REQ-AUTO-6 — Never.** Merge, approve, request reviewers, mark ready (unless `pr.auto_ready`),
comment on trackers, write `.sdd/config.yaml`, rules, constitution or approvals, or change the main
checkout beyond `fetch` and worktree management. Enforced by guard and gate in autopilot mode.

**REQ-AUTO-7 — Report.** Always written, even on abort: `.sdd/local/autopilot/<timestamp>.md` with
the outcome per task, plans awaiting approval, blocked items with their question, budget used and
work deferred by caps.
- AC-AUTO-7.1 Given a pass aborted by the time budget, When it ends, Then the report exists and
  lists the deferred tasks.
