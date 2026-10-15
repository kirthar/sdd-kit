# Spec: hooks

Status: draft · Cites: K3, K4, K9 · ADRs: 0003, 0007

## Purpose
Make irreversible actions and skipped approvals impossible by default, while leaving the human
in full control.

## Protocol (both hooks)
PreToolUse, exec form `node ${CLAUDE_PLUGIN_ROOT}/hooks/<name>.mjs`. Input JSON from stdin
(`tool_name`, `tool_input`, `cwd`). Allow: exit 0, no output. Block: exit 2 with stderr
`sdd-<hook>: <reason>` and, when a command applies, `Run it yourself if intended: ! <command>`.
Hooks never pass through the CLI's exit codes; an internal error allows (exit 0, warning on stderr),
except that guard blocks a `git`/`gh` command it cannot parse. Hooks spawn no processes and read
only files (config, state, `.git` pointers, locks).

"Autopilot mode" = a pass lock in `<git-common-dir>/sdd/locks/` with a fresh heartbeat.

## guard (matcher `Bash`)

**REQ-HOOK-1 — Blocked shapes.**

| Group | Blocked |
|---|---|
| Push | `--force`, `-f`, `--force-with-lease`, `--force-if-includes`, `+<ref>` refspecs, `--delete`/`-d`, `:<ref>` deletion, `--mirror`, `--prune`, `--no-verify`; any compound command (`;`, `&&`, `\|\|`, `\|`, `$(`, backticks) containing a push |
| History | `commit --amend`; `rebase` when `git.integration: merge`; `filter-branch`; `filter-repo`; `reflog expire\|delete`; `update-ref -d` |
| Local destruction | `branch -D` / `--delete --force`; `reset --hard`; `clean -f…`; `checkout -- <path>` / `restore` without `--staged`; `worktree remove --force`; `stash drop\|clear` |
| Forge | `gh pr merge`; `gh pr review`; `--reviewer` / `--add-reviewer`; `gh pr ready` unless `pr.auto_ready`; `gh pr create` without `--draft` when `pr.draft`; `gh repo delete`; `gh api` with DELETE or a merge/review endpoint |
| Escape hatches | `git config` writes to `alias.*`, `push.*`, `receive.*`, `remote.*.push`, `url.*`, `core.hooksPath`; `commit --no-verify` |
| Mentions | `@handle` in `gh pr\|issue create\|comment\|edit` bodies and `--body-file` contents, outside inline or fenced code |
| Approvals | `sdd.mjs approve` from the Bash tool; shell writes (`>`, `tee`, `sed -i`) to `docs/changes/*/state.yaml` |
| Autopilot mode only | Any git verb other than `fetch`, `worktree add\|list\|remove\|prune` and read-only verbs against the main checkout; writes to `.sdd/config.yaml`, `.sdd/rules.md`, `.sdd/constitution.md` |

- AC-HOOK-1.1 Given each blocked shape in the fixture table (≥45 cases), When guard evaluates it,
  Then it exits 2 with the reason and the hand-off line.

**REQ-HOOK-2 — No false positives.**
- AC-HOOK-2.1 Given `grep "git push --force" notes.md`, When guard evaluates it, Then it allows.
- AC-HOOK-2.2 Given `bash -c 'git push --force'` or `eval "git push -f"`, When guard evaluates it,
  Then it blocks (the payload is parsed).
- AC-HOOK-2.3 Given `git push -u origin HEAD`, `git commit -m "x"` or
  `gh pr create --draft --base main`, When guard evaluates it, Then it allows.
- AC-HOOK-2.4 Given a PR body with `` `@Override` `` in inline code, When guard evaluates it, Then
  it allows.

Known limit: command substitutions inside an unquoted heredoc body are not parsed.

**REQ-HOOK-3 — Hand-off.** The block message repeats the exact original command prefixed with `!`.
- AC-HOOK-3.1 Given `git push --force-with-lease origin feat`, When blocked, Then stderr contains
  `! git push --force-with-lease origin feat`.

## gate (matcher `Edit|Write|MultiEdit|NotebookEdit`)

**REQ-HOOK-4 — Approval gate.** With `gates.enforce: true` (default) in an initialised repo, a write
outside `docs/`, `.sdd/` and `gates.exempt` is allowed only when the active change (per-worktree
pointer) has every approval its route requires (lifecycle spec).
- AC-HOOK-4.1 Given no active change, When the model edits `src/a.ts`, Then it is blocked with
  "ask the person to run `/sdd:new` and `/sdd:approve <id> route`".
- AC-HOOK-4.2 Given a quick change with `route` approved, When the model edits `src/a.ts`, Then it
  is allowed.
- AC-HOOK-4.3 Given a standard change with `spec` approved and no `tasks` approval, When the model
  edits `src/a.ts`, Then it is blocked naming `/sdd:approve <id> tasks`.
- AC-HOOK-4.4 Given `gates.enforce: false` or no `.sdd/config.yaml`, When the model edits
  `src/a.ts`, Then it is allowed.
- AC-HOOK-4.5 Given an autopilot worktree whose pointer names an approved change, When the
  implementer edits a file, Then it is allowed.

**REQ-HOOK-5 — Approvals and kit config are human-owned.** Blocked: an Edit/Write to
`docs/changes/*/state.yaml` that adds or changes an entry under `approvals`; in autopilot mode, any
write to `.sdd/config.yaml`, `.sdd/rules.md` or `.sdd/constitution.md`.
- AC-HOOK-5.1 Given `/sdd:new` writing `approvals: {}`, When gate evaluates it, Then it allows.
- AC-HOOK-5.2 Given an Edit adding `tasks:` under `approvals`, When gate evaluates it, Then it blocks.

**REQ-HOOK-6 — Performance.**
- AC-HOOK-6.1 Given a fixture repo with 1,000 change folders, When either hook runs 100 times, Then
  the p95 is under 200 ms.
