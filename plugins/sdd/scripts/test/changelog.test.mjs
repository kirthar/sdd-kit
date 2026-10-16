// Changelog entries per change, folded on archive (REQ-VAL-9, REQ-CFG-7).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpRepo, CONFIG, state } from './helpers.mjs';
import { archive } from '../lib/archive.mjs';

const SDD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'sdd.mjs');
const run = (cwd, ...args) => spawnSync('node', [SDD, ...args], { cwd, encoding: 'utf8' });
const BRIEF = '# Brief: x\n\n## Problem\nx\n\n## Expected behaviour\nx\n\n## Proving test\nx\n';
const ENTRIES = '# Changelog: x\n\n### Added\n- `sdd restack` integrates a slice after a squash merge.\n\n### Fixed\n- Stacked pull requests no longer conflict\n  after the slice below is squash-merged.\n';
const LOG = '# Changelog\n\n## [Unreleased]\n\n### Fixed\n- An earlier fix.\n\n## [0.2.0] - 2026-10-16\n### Added\n- Old entry.\n';

function quick(files = {}) {
  return tmpRepo({
    '.sdd/config.yaml': CONFIG,
    'docs/changes/q1/state.yaml': state('q1', 'quick', ['route']),
    'docs/changes/q1/brief.md': BRIEF,
    'docs/changes/q1/changelog.md': ENTRIES,
    ...files,
  });
}

test('archive folds changelog entries under the matching Unreleased headings (AC-7)', () => {
  const root = quick({ 'CHANGELOG.md': LOG });
  const r = archive(root, 'q1', { mergedConfirmed: true });
  assert.equal(r.ok, true, r.message);
  assert.equal(fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8'), `# Changelog

## [Unreleased]

### Added
- \`sdd restack\` integrates a slice after a squash merge.

### Fixed
- An earlier fix.
- Stacked pull requests no longer conflict
  after the slice below is squash-merged.

## [0.2.0] - 2026-10-16
### Added
- Old entry.
`);
  assert.match(r.message, /changelog: 2 entries/);
  assert.ok(fs.existsSync(path.join(root, 'docs/changes/archive/q1/changelog.md')));
});

test('archive without a project changelog skips the fold (AC-8)', () => {
  const root = quick();
  const r = archive(root, 'q1', { mergedConfirmed: true });
  assert.equal(r.ok, true, r.message);
  assert.match(r.message, /changelog: skipped/);
  assert.ok(!fs.existsSync(path.join(root, 'CHANGELOG.md')));
});

test('archive follows paths.changelog', () => {
  const root = quick({ '.sdd/config.yaml': `${CONFIG}paths: { changelog: docs/CHANGES.md }\n`, 'docs/CHANGES.md': LOG });
  assert.equal(archive(root, 'q1', { mergedConfirmed: true }).ok, true);
  assert.match(fs.readFileSync(path.join(root, 'docs/CHANGES.md'), 'utf8'), /sdd restack/);
});

test('paths.changelog defaults to CHANGELOG.md and must stay inside the project (AC-9)', () => {
  const cfg = JSON.parse(run(tmpRepo({ '.sdd/config.yaml': 'version: 1\n' }), 'config', '--json').stdout);
  assert.equal(cfg.paths.changelog, 'CHANGELOG.md');
  const r = run(tmpRepo({ '.sdd/config.yaml': 'version: 1\npaths: { changelog: ../x.md }\n' }), 'validate', '--all');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /V-CONFIG[^\n]*paths\.changelog/);
});
