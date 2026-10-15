import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpRepo, writeFiles, CONFIG, state } from '../../scripts/test/helpers.mjs';
import { writeActive, sddCommonDir } from '../../scripts/lib/git.mjs';
import { evaluate } from '../gate.mjs';

const GATE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'gate.mjs');

function write(root, rel, content = 'x') {
  return { tool_name: 'Write', cwd: root, tool_input: { file_path: path.join(root, rel), content } };
}

function repoWith(route, approvals, { active = true } = {}) {
  const root = tmpRepo({ '.sdd/config.yaml': CONFIG, 'docs/changes/c1/state.yaml': state('c1', route, approvals) });
  if (active) writeActive(root, 'c1');
  return root;
}

test('no active change blocks code writes (AC-HOOK-4.1)', () => {
  const root = tmpRepo({ '.sdd/config.yaml': CONFIG });
  const r = evaluate(write(root, 'src/a.ts'));
  assert.equal(r.decision, 'block');
  assert.match(r.reason, /\/sdd:new/);
  assert.match(r.reason, /\/sdd:approve <id> route/);
});

test('quick change without route approval blocks (AC-LIFE-1.3)', () => {
  const root = repoWith('quick', []);
  const r = evaluate(write(root, 'src/a.ts'));
  assert.equal(r.decision, 'block');
  assert.match(r.reason, /\/sdd:approve c1 route/);
});

test('quick change with route approved allows (AC-HOOK-4.2)', () => {
  const root = repoWith('quick', ['route']);
  assert.equal(evaluate(write(root, 'src/a.ts')).decision, 'allow');
});

test('standard change missing tasks approval blocks naming it (AC-HOOK-4.3)', () => {
  const root = repoWith('standard', ['route', 'spec']);
  writeFiles(root, { 'docs/changes/c1/delta.md': '# d\n', 'docs/changes/c1/tasks.md': '# t\n' });
  const r = evaluate(write(root, 'src/a.ts'));
  assert.equal(r.decision, 'block');
  assert.match(r.reason, /\/sdd:approve c1 tasks/);
});

test('full change with every approval allows', () => {
  const root = repoWith('full', ['route', 'functional', 'spec', 'tasks']);
  assert.equal(evaluate(write(root, 'src/a.ts')).decision, 'allow');
});

test('gates.enforce false allows (AC-HOOK-4.4)', () => {
  const root = tmpRepo({ '.sdd/config.yaml': 'version: 1\ngates: { enforce: false }\n' });
  assert.equal(evaluate(write(root, 'src/a.ts')).decision, 'allow');
});

test('repository without .sdd/config.yaml allows (AC-HOOK-4.4)', () => {
  const root = tmpRepo();
  assert.equal(evaluate(write(root, 'src/a.ts')).decision, 'allow');
});

test('docs, .sdd and configured exempt paths are never gated', () => {
  const root = tmpRepo({ '.sdd/config.yaml': 'version: 1\ngates: { exempt: ["notes/**"] }\n' });
  assert.equal(evaluate(write(root, 'docs/changes/x/brief.md')).decision, 'allow');
  assert.equal(evaluate(write(root, '.sdd/rules.md')).decision, 'allow');
  assert.equal(evaluate(write(root, 'notes/today.md')).decision, 'allow');
});

test('files outside the repository are not gated', () => {
  const root = tmpRepo({ '.sdd/config.yaml': CONFIG });
  const outside = fs.mkdtempSync(path.join(path.dirname(root), 'outside-'));
  const r = evaluate({ tool_name: 'Write', cwd: root, tool_input: { file_path: path.join(outside, 'a.txt'), content: '' } });
  assert.equal(r.decision, 'allow');
});

test('other tools are ignored', () => {
  const root = tmpRepo({ '.sdd/config.yaml': CONFIG });
  assert.equal(evaluate({ tool_name: 'Read', cwd: root, tool_input: { file_path: path.join(root, 'src/a.ts') } }).decision, 'allow');
});

test('a linked worktree uses its own active pointer (AC-HOOK-4.5)', () => {
  const root = repoWith('quick', ['route'], { active: false });
  const git = (...a) => execFileSync('git', ['-C', root, '-c', 'user.name=t', '-c', 'user.email=t@e.invalid', ...a]);
  git('add', '-A');
  git('commit', '-qm', 'init');
  const wt = `${root}-wt`;
  git('worktree', 'add', '-q', wt, '-b', 'feat');
  assert.equal(evaluate(write(wt, 'src/a.ts')).decision, 'block');
  writeActive(wt, 'c1');
  assert.equal(evaluate(write(wt, 'src/a.ts')).decision, 'allow');
});

test('creating state.yaml with empty approvals is allowed (AC-HOOK-5.1)', () => {
  const root = tmpRepo({ '.sdd/config.yaml': CONFIG });
  const r = evaluate(write(root, 'docs/changes/c2/state.yaml', state('c2', 'quick')));
  assert.equal(r.decision, 'allow');
});

test('adding an approval through Edit is blocked (AC-HOOK-5.2)', () => {
  const root = repoWith('standard', ['route']);
  const file = path.join(root, 'docs/changes/c1/state.yaml');
  const current = fs.readFileSync(file, 'utf8');
  const old = current.match(/  route: .*\n/)[0];
  const r = evaluate({
    tool_name: 'Edit',
    cwd: root,
    tool_input: { file_path: file, old_string: old, new_string: `${old}  tasks: { by: Agent, at: now }\n` },
  });
  assert.equal(r.decision, 'block');
  assert.match(r.reason, /\/sdd:approve/);
});

test('changing other state fields is allowed', () => {
  const root = repoWith('standard', ['route']);
  const file = path.join(root, 'docs/changes/c1/state.yaml');
  const r = evaluate({ tool_name: 'Edit', cwd: root, tool_input: { file_path: file, old_string: 'prs: []', new_string: 'prs: [https://example.invalid/pr/1]' } });
  assert.equal(r.decision, 'allow');
});

test('rewriting state.yaml with a changed approval is blocked', () => {
  const root = repoWith('standard', ['route']);
  const r = evaluate(write(root, 'docs/changes/c1/state.yaml', state('c1', 'standard', ['route', 'spec'])));
  assert.equal(r.decision, 'block');
});

test('autopilot mode blocks writes to kit config, rules and constitution', () => {
  const root = repoWith('quick', ['route']);
  const lock = path.join(sddCommonDir(root), 'locks', 'pass');
  fs.mkdirSync(lock, { recursive: true });
  fs.writeFileSync(path.join(lock, 'heartbeat'), '');
  for (const f of ['.sdd/config.yaml', '.sdd/rules.md', '.sdd/constitution.md']) {
    assert.equal(evaluate(write(root, f)).decision, 'block', f);
  }
  assert.equal(evaluate(write(root, 'src/a.ts')).decision, 'allow');
});

test('stale autopilot heartbeat does not count as autopilot mode', () => {
  const root = repoWith('quick', ['route']);
  const lock = path.join(sddCommonDir(root), 'locks', 'pass');
  fs.mkdirSync(lock, { recursive: true });
  const hb = path.join(lock, 'heartbeat');
  fs.writeFileSync(hb, '');
  const old = new Date(Date.now() - 60 * 60 * 1000);
  fs.utimesSync(hb, old, old);
  assert.equal(evaluate(write(root, '.sdd/rules.md')).decision, 'allow');
});

test('stdin wrapper: block exits 2 with sdd-gate prefix, allow exits 0', () => {
  const root = tmpRepo({ '.sdd/config.yaml': CONFIG });
  const blocked = spawnSync('node', [GATE], { input: JSON.stringify(write(root, 'src/a.ts')) });
  assert.equal(blocked.status, 2);
  assert.match(blocked.stderr.toString(), /^sdd-gate: /);
  const allowed = spawnSync('node', [GATE], { input: JSON.stringify(write(root, 'docs/x.md')) });
  assert.equal(allowed.status, 0);
  const garbage = spawnSync('node', [GATE], { input: 'not json' });
  assert.equal(garbage.status, 0);
});

test('performance: p95 under 200 ms with 1,000 changes (AC-HOOK-6.1)', () => {
  const root = repoWith('quick', ['route']);
  const files = {};
  for (let i = 0; i < 1000; i++) files[`docs/changes/x${i}/state.yaml`] = state(`x${i}`, 'quick');
  writeFiles(root, files);
  const times = [];
  for (let i = 0; i < 100; i++) {
    const t = process.hrtime.bigint();
    evaluate(write(root, 'src/a.ts'));
    times.push(Number(process.hrtime.bigint() - t) / 1e6);
  }
  times.sort((a, b) => a - b);
  assert.ok(times[94] < 200, `p95 ${times[94]} ms`);
});
