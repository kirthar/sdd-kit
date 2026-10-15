---
name: setting-up-github-issues
description: Guides connecting GitHub Issues through the person's gh CLI so tasks can optionally be synced as issues. Use when someone wants tasks or specs mirrored to GitHub Issues.
---

# Set up GitHub Issues (optional)

Files in the repository remain the source of truth; issues only link back to task headings.

1. Check `gh --version` and `gh auth status`. If gh is missing or unauthenticated, explain how to
   install it and run `gh auth login` themselves (suggest `! gh auth login`); never handle tokens.
2. Read-only test: `gh repo view --json nameWithOwner`.
3. Ask which repository should receive the issues (default: this one) and an optional label.
4. Show the block and, after confirmation, add it to `.sdd/config.yaml`:
   ```yaml
   integrations:
     tracker: { kind: github, repo: <owner/name>, label: sdd, write: confirm }
   ```
5. Explain that `/sdd:sync` shows a dry run first and never assigns, comments or closes issues.
