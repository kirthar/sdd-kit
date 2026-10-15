# Quickstart

1. **Install** (once per machine):
   ```bash
   claude plugin marketplace add kirthar/sdd-kit
   claude plugin install sdd@sdd-kit
   ```
2. **Initialise** your repository: open Claude Code in it and run `/sdd:init`. Review the proposed
   `.sdd/config.yaml` (detected test, lint and format commands), the constitution and the files to
   be written, then confirm. Nothing is written before you confirm.
3. **Make a change** — just ask: *"The confirmation email says bookng, fix it."*
   Claude proposes a route with its reasons and stops. Confirm it:
   ```
   /sdd:approve <id> route
   ```
4. Claude implements test-first (`/sdd:implement`): a failing test, the minimum code, a commit.
5. `/sdd:pr` writes the description and opens a **draft** pull request. You review and merge.
6. After merging: `/sdd:archive <id>` updates the living specs.

Larger change? The same flow adds `/sdd:spec` → `/sdd:approve <id> spec` → `/sdd:tasks` →
`/sdd:approve <id> tasks` before implementation, and `/sdd:refine` first for a new capability.

At any time: `/sdd:status` shows what is open and the next command.
