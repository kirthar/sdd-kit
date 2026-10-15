---
name: setting-up-linear
description: Guides connecting the person's own Linear workspace through their MCP server so tasks can optionally be synced. Use when someone wants tasks mirrored to Linear.
---

# Set up Linear (optional)

1. Check whether a Linear-capable MCP server is available (tool names mentioning linear). If not,
   explain how the person adds their own with `claude mcp add …`, authenticating through its OAuth
   flow or an API key kept in an environment variable — never in repository files.
2. Read-only test: list teams. On failure, explain the likely cause and stop.
3. Ask for the team key (and optional project).
4. Show the block and, after confirmation, add it to `.sdd/config.yaml`:
   ```yaml
   integrations:
     tracker: { kind: linear, team: <KEY>, write: confirm }
   ```
5. Explain that `/sdd:sync` shows a dry run first and never assigns, comments or changes states.
