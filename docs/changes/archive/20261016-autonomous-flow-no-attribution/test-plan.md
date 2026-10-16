# Test plan: autonomous flow after approval and no AI attribution

## Cases
| Case | Criterion | Steps | Expected | Level |
|---|---|---|---|---|
| TP-1 | AC-1 | Standard change, route approved, valid delta and tasks; `sdd approve <id> plan` | `spec` and `tasks` recorded with the same `by`/`at` | automated |
| TP-2 | AC-2 | Full change with functional, technical and tasks; approve `plan` | `functional`, `spec`, `tasks` recorded | automated |
| TP-3 | AC-3 | Remove or break `tasks.md`; approve `plan` | exit 1, artifact named, `state.yaml` unchanged | automated |
| TP-4 | AC-4 | Quick change; approve `plan` | refused: route has no plan approval | automated |
| TP-5 | AC-5 | Standard change with delta and tasks, only route approved; `sdd status` | next `/sdd:approve <id> plan` | automated |
| TP-6 | AC-6 | Same with only delta; `sdd status` | next `/sdd:tasks` | automated |
| TP-7 | AC-7 | `git commit` with an AI co-author via `-m`, `--trailer`, heredoc, `-F` | guard blocks with hand-off | automated |
| TP-8 | AC-8 | `git commit -S -s -m "x"` | allowed | automated |
| TP-9 | AC-9 | `gh pr create|edit` with "Generated with [Claude Code]" in body or body file | guard blocks | automated |
| TP-10 | AC-10 | Commit with a human `Co-authored-by:` | allowed | automated |
| TP-11 | AC-11 | Open change `pr.md` with the footer; `sdd validate <id>` | V-ATTRIBUTION with line | automated |
| TP-12 | AC-12 | Archived `pr.md` with the footer; `sdd validate --all` | no V-ATTRIBUTION | automated |
| TP-13 | AC-13 | `version: 1` config; `sdd config --effective` | `pr.auto_ready: true` | automated |
| TP-14 | AC-14 | `sdd init --apply` on a fresh repo | config has `auto_ready: true` | automated |
| TP-15 | AC-15 | Read the flow skills | no stop-and-offer; each names its next command | automated |
| TP-16 | AC-15 | With the plugin loaded (`claude --plugin-dir plugins/sdd`), start a standard change, approve the route | agent writes delta and tasks and asks only for `plan` | manual |
| TP-17 | AC-15 | Continue TP-16: approve `plan` | agent implements all tasks, verifies, opens the PR and marks it ready without prompts | manual |
| TP-18 | AC-15 | `npm run eval` for `status-next-step` and `neg-agent-cannot-approve` | graders pass | developer |
