import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { tmpRepo, CONFIG, state } from './helpers.mjs';
import { findRepoRoot, gitDir, commonDir, readActive, writeActive } from '../lib/git.mjs';
import { loadConfig, validateConfig } from '../lib/config.mjs';
import { requiredApprovals, missingApprovals, loadChange, derivePhase, nextCommand } from '../lib/changes.mjs';

test('finds repo root from a nested directory', () => {
  const dir = tmpRepo({ 'src/a.js': '' });
  assert.equal(findRepoRoot(path.join(dir, 'src')), fs.realpathSync(dir));
});

test('active pointer is per worktree and readable without git', () => {
  const dir = tmpRepo({ 'a.txt': 'x' });
  execFileSync('git', ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@e.invalid', 'commit', '-qam', 'i', '--allow-empty']);
  execFileSync('git', ['-C', dir, 'add', '-A']);
  execFileSync('git', ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@e.invalid', 'commit', '-qm', 'files']);
  const wt = path.join(path.dirname(dir), path.basename(dir) + '-wt');
  execFileSync('git', ['-C', dir, 'worktree', 'add', '-q', wt, '-b', 'feat']);
  writeActive(dir, 'main-change');
  writeActive(wt, 'wt-change');
  assert.equal(readActive(dir), 'main-change');
  assert.equal(readActive(wt), 'wt-change');
  assert.notEqual(gitDir(wt), gitDir(dir));
  assert.equal(commonDir(gitDir(wt)), commonDir(gitDir(dir)));
});

test('missing config means not initialised', () => {
  const dir = tmpRepo();
  assert.equal(loadConfig(dir).exists, false);
});

test('defaults fill missing keys (AC-CFG-2.1)', () => {
  const dir = tmpRepo({ '.sdd/config.yaml': 'version: 1\n' });
  const { config } = loadConfig(dir);
  assert.equal(config.gates.enforce, true);
  assert.equal(config.pr.draft, true);
  assert.equal(config.testing.tdd, 'strict');
});

test('invalid enum is an error naming the key (AC-CFG-1.1)', () => {
  const f = validateConfig({ version: 1, testing: { tdd: 'sometimes' } });
  assert.ok(f.some((x) => x.level === 'error' && x.rule === 'V-CONFIG' && x.message.includes('testing.tdd')));
});

test('unknown key is only a warning (AC-CFG-1.2)', () => {
  const f = validateConfig({ version: 1, foo: 1 });
  assert.ok(f.every((x) => x.level === 'warn'));
  assert.equal(f.length, 1);
});

test('required approvals per route', () => {
  assert.deepEqual(requiredApprovals('quick'), ['route']);
  assert.deepEqual(requiredApprovals('standard'), ['route', 'spec', 'tasks']);
  assert.deepEqual(requiredApprovals('full'), ['route', 'functional', 'spec', 'tasks']);
});

test('phase is derived from artifacts and approvals', () => {
  const dir = tmpRepo({
    '.sdd/config.yaml': CONFIG,
    'docs/changes/c1/state.yaml': state('c1', 'standard', ['route']),
  });
  const c = loadChange(dir, 'c1');
  assert.deepEqual(missingApprovals(c.state), ['spec', 'tasks']);
  assert.equal(derivePhase(c), 'spec');
  assert.equal(nextCommand(c), '/sdd:spec');
  fs.writeFileSync(path.join(c.dir, 'delta.md'), '# d\n');
  assert.equal(derivePhase(loadChange(dir, 'c1')), 'spec-approval');
  assert.equal(nextCommand(loadChange(dir, 'c1')), '/sdd:approve c1 spec');
});

test('quick change waiting for route confirmation (AC-LIFE-1.3 precondition)', () => {
  const dir = tmpRepo({ 'docs/changes/q/state.yaml': state('q', 'quick') });
  const c = loadChange(dir, 'q');
  assert.equal(derivePhase(c), 'route-approval');
  assert.equal(nextCommand(c), '/sdd:approve q route');
});

test('project root is the nearest folder with .sdd/config.yaml inside the repository', async () => {
  const { findProjectRoot } = await import('../lib/git.mjs');
  const dir = tmpRepo({ 'examples/app/.sdd/config.yaml': CONFIG, 'examples/app/src/a.js': '' });
  assert.equal(findProjectRoot(path.join(dir, 'examples/app/src')), fs.realpathSync(path.join(dir, 'examples/app')));
  assert.equal(findProjectRoot(dir), fs.realpathSync(dir));
});
