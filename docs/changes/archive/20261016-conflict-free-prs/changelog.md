# Changelog: conflict-free pull requests

### Added
- `sdd restack` integrates a stacked slice after the slice below is squash-merged, without conflicts or force push.
- `sdd conflicts` simulates merging the base; `/sdd:pr` resolves conflicts before marking a pull request ready.
- Per-change release notes in `docs/changes/<id>/changelog.md`, folded into `paths.changelog` (default `CHANGELOG.md`) by `sdd archive`.

### Fixed
- Stacked pull requests no longer conflict after the slice below is squash-merged.
