# Architecture decision records

| ADR | Decision |
|---|---|
| [0001](0001-size-based-routes.md) | Size-based routes: `quick`, `standard`, `full` |
| [0002](0002-living-specs-with-deltas.md) | Living specs in `docs/specs/`, changes as deltas in `docs/changes/<id>/` |
| [0003](0003-rules-enforced-by-tools.md) | Critical rules enforced by hooks, validators and CI |
| [0004](0004-stack-independence.md) | Stack independence through detected `.sdd/config.yaml` |
| [0005](0005-files-first-optional-integrations.md) | Files first; trackers and wikis are optional integrations |
| [0006](0006-distribution-as-marketplace.md) | Repo is a marketplace with one plugin, `sdd` |
| [0007](0007-node-single-runtime.md) | Node.js is the single runtime for scripts and hooks |
| [0008](0008-two-interaction-points.md) | Two interaction points, then an autonomous run to a ready pull request |
| [0009](0009-squash-merges-and-stacked-slices.md) | Semantic squash merges and stacked slices under a size budget |
| [0010](0010-conflict-free-pull-requests.md) | Pull requests reach the person without conflicts |

Format: Status · constitution IDs cited · Context · Decision · Consequences · Rejected alternatives.
