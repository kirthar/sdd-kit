// Pull requests end ready for review by default (REQ-CFG-2, REQ-LIFE-9).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpRepo } from './helpers.mjs';
import { initApply } from '../lib/init.mjs';
import { evaluate } from '../../hooks/guard.mjs';

const SDD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'sdd.mjs');
const run = (cwd, ...args) => spawnSync('node', [SDD, ...args], { cwd, encoding: 'utf8' });

test('pr.auto_ready defaults to true (AC-13, AC-CFG-2.1)', () => {
  const root = tmpRepo({ '.sdd/config.yaml': 'version: 1\n' });
  const r = run(root, 'config', '--effective', '--json');
  assert.equal(r.status, 0, r.stderr);
  const pr = JSON.parse(r.stdout).pr ?? JSON.parse(r.stdout).config?.pr;
  assert.deepEqual({ draft: pr.draft, auto_ready: pr.auto_ready }, { draft: true, auto_ready: true });
});

test('init writes auto_ready: true (AC-14)', () => {
  const root = tmpRepo({ 'package.json': JSON.stringify({ scripts: { test: 'node --test' } }) });
  initApply(root, {});
  assert.match(fs.readFileSync(path.join(root, '.sdd/config.yaml'), 'utf8'), /^pr: \{[^}]*auto_ready: true/m);
});

test('the guard lets the agent mark a PR ready under the defaults', () => {
  const root = tmpRepo({ '.sdd/config.yaml': 'version: 1\n' });
  const r = evaluate({ tool_name: 'Bash', tool_input: { command: 'gh pr ready 12' }, cwd: root });
  assert.equal(r.decision, 'allow', r.reason);
});
