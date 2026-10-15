# Security policy

## Scope
The parts of this kit that run code on your machine:
- the `guard` and `gate` hooks (`plugins/sdd/hooks/`), which inspect commands and file writes;
- the `sdd` CLI and its helpers (`plugins/sdd/scripts/`), including the secret scanner;
- the shell commands that skills inject before they run.

Relevant reports include a way to bypass a hook's block (for example a force push or an approval
written by the agent), command injection through skill arguments or configuration, the scanner
printing a secret value, or any script writing outside the repository it was run in.

Out of scope: behaviour of Claude Code itself, third-party MCP servers you connect, and
`npx`-installed tools (report those to their maintainers).

## Reporting
Please use GitHub's private vulnerability reporting
(**Security → Report a vulnerability** on this repository). Do not open a public issue.
Include the version, your operating system, Node.js version, and the smallest command or file
that reproduces the problem.

You can expect an acknowledgement within a week. Fixes are released as a patch version and
credited in the changelog unless you prefer otherwise.

## Supported versions
Only the latest minor release receives security fixes.
