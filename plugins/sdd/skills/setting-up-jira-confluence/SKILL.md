---
name: setting-up-jira-confluence
description: Guides connecting the person's own Jira and Confluence (through their MCP server) to the spec-driven workflow, testing the connection and enabling optional sync. Use when someone wants to link Jira, Confluence or Atlassian to their specs and tasks.
---

# Set up Jira and Confluence (optional)

The kit never ships servers, URLs or credentials. Files in the repository stay the source of
truth; Jira and Confluence receive link-backs through `/sdd:sync`.

1. Check whether an Atlassian-capable MCP server is already available (tools whose names mention
   jira, confluence or atlassian). If not, explain how the person adds their own — the official
   remote server or another of their choice — with `claude mcp add …` using **their** site URL
   (`<your Atlassian site URL>`). Credentials go in environment variables or their secret
   manager / OAuth flow, never in repository files.
2. Run a read-only connection test (list accessible projects or spaces). If it fails, say whether
   it looks like authentication, a wrong site, or the network, and stop without enabling anything.
3. Ask for the Jira project key and the Confluence space and parent page the person wants.
4. Show the block below and, after confirmation, add it to `.sdd/config.yaml`:
   ```yaml
   integrations:
     tracker: { kind: jira, project: <KEY>, write: confirm }
     docs: { kind: confluence, space: <SPACE>, parent: <page id>, write: confirm }
   ```
5. Explain that `/sdd:sync` always shows a dry run first and never transitions, assigns or comments.
