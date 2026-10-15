# Optional integrations

The kit is complete with files only. Integrations mirror specs and tasks elsewhere with link-backs
to the repository, which stays the source of truth. The kit ships no servers, URLs or credentials.

| Tool | Setup skill | Connection |
|---|---|---|
| Jira + Confluence | `setting-up-jira-confluence` | your own Atlassian MCP server |
| GitHub Issues | `setting-up-github-issues` | your `gh` CLI login |
| Linear | `setting-up-linear` | your own Linear MCP server |

Ask Claude, for example *"connect our Jira and Confluence"*. The setup skill checks what is
available, guides you through adding your own server with your own site, keeps credentials in
environment variables or your secret manager, runs a read-only connection test, and only then adds
an `integrations` block to `.sdd/config.yaml`:

```yaml
integrations:
  tracker: { kind: jira, project: <KEY>, write: confirm }
  docs: { kind: confluence, space: <SPACE>, parent: <page id>, write: confirm }
```

`/sdd:sync [id]` then shows a dry run (every create and update), waits for your confirmation,
writes one item and reads it back, then the rest. Remote ids are stored in
`docs/changes/<id>/sync.yaml`, so re-running updates instead of duplicating. Sync never transitions,
assigns, comments or mentions. If a tool is unreachable, sync warns and nothing else is affected.
