# Rolling out to a team

Commit this to the repository's `.claude/settings.json` (or let `/sdd:init` write it):

```json
{
  "extraKnownMarketplaces": {
    "sdd-kit": { "source": { "source": "github", "repo": "kirthar/sdd-kit", "ref": "v0.1.0" } }
  },
  "enabledPlugins": { "sdd@sdd-kit": true }
}
```

Teammates who open the repository in Claude Code and trust the workspace get the plugin with no
manual steps. Pin `ref` to a release tag and bump it deliberately.

Also commit
- `.sdd/config.yaml`, the constitution (`.sdd/constitution.md` unless `paths.constitution` says otherwise), `.sdd/rules.md` — shared process configuration.
- `AGENTS.md` (with the `sdd` section) and the `@AGENTS.md` line in `CLAUDE.md`.
- `.github/workflows/sdd-validate.yml` — offered by `/sdd:init`; runs `sdd validate --all` on
  every pull request so the rules hold even for changes made without Claude.

Working agreements worth stating in the constitution or rules
- Who may approve which phase (approvals record the git user name).
- Whether rebasing is allowed (`git.integration`); force pushes stay a human action either way.
- Whether `/sdd:autopilot` is enabled, and on which schedule.
