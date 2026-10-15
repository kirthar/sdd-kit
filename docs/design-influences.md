# Design influences

Public work that shaped the kit. Where the kit differs, the reason is recorded in an ADR.

| Source | What the kit takes from it | Where |
|---|---|---|
| Birgitta Böckeler, [Understanding Spec-Driven-Development: Kiro, spec-kit, and Tessl](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html) | The warning that one-size-fits-all spec workflows over-process small changes; the distinction between spec-first and spec-anchored | [ADR-0001](adr/0001-size-based-routes.md), [ADR-0002](adr/0002-living-specs-with-deltas.md) |
| [OpenSpec](https://github.com/Fission-AI/OpenSpec) | Living specs plus change proposals with ADDED / MODIFIED / REMOVED deltas merged on archive | [ADR-0002](adr/0002-living-specs-with-deltas.md) |
| Anthropic, [Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) | Descriptions written for discovery, bodies under 500 lines, one level of references, scripts for deterministic work | [CONTRIBUTING](../CONTRIBUTING.md) |
| [AGENTS.md](https://agents.md/) | One predictable file where any coding agent finds the process | [init spec](specs/init.md) |
| [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/) | Release notes and version numbers | [CHANGELOG](../CHANGELOG.md) |
| Steve Freeman and Nat Pryce, *Growing Object-Oriented Software, Guided by Tests* | Outside-in TDD: start from the outermost behaviour, one failing test at a time | [TDD reference](../plugins/sdd/references/tdd.md) |
