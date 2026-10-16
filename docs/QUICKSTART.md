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
4. Claude continues on its own: implements test-first (a failing test, the minimum code, a commit),
   verifies, writes the description and opens the pull request, marked ready for review once
   verification is GO. You review and merge.
6. After merging: `/sdd:archive <id>` updates the living specs.

Larger change? After the route, Claude asks all its questions, writes the spec and the tasks
(and the functional spec first for a new capability), then asks once:
```
/sdd:approve <id> plan
```
Everything after that runs without prompts. A change over the review budget arrives as several
small stacked pull requests: merge them bottom-up; each lands as one semantic squash commit.

At any time: `/sdd:status` shows what is open and the next command.
