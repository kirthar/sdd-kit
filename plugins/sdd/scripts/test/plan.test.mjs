// One `plan` approval records every planning phase of a route (REQ-LIFE-5, REQ-LIFE-14).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpRepo, CONFIG, state } from './helpers.mjs';

const SDD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'sdd.mjs');
const run = (cwd, ...args) => spawnSync('node', [SDD, ...args], { cwd, encoding: 'utf8', env: { ...process.env, SDD_OFFLINE: '1' } });
const stateOf = (root, id) => fs.readFileSync(path.join(root, 'docs/changes', id, 'state.yaml'), 'utf8');

const LIVING = `---\nstatus: verified\n---\n# Bookings\n\n## Purpose\nBookings.\n\n## Requirements\n\n### REQ-BOOK-1: Create a booking\nOld text.\n\n## History\n`;
const DELTA = `# Delta: cancel\n\n## Why\nx\n\n## Reuse\n- src\n\n## ADDED\n### REQ-BOOK-3: Cancel a booking\nCancel text.\n\n## MODIFIED\n\n## REMOVED\n\n## Acceptance criteria\n- AC-1 Given a booking, When cancelled, Then it is cancelled.\n\n## Open questions\n`;
const TASKS = '# Tasks\n\n## T1: Add cancel\n- Covers: AC-1\n- Expected paths: src/**\n- Outermost test: cancel at module level\n- Depends on: none\n- Package: .\n- Status: todo\n';
const FUNCTIONAL = '# F\n\n## Problem\nx\n\n## Scope\nx\n\n## Out of scope\nx\n\n## Acceptance criteria\n- AC-1 Given a, When b, Then c.\n\n## Open questions\n';
const TECHNICAL = '# Technical\n\n## Reuse\nx\n\n## Contracts\nx\n\n## Rules\nx\n\n## Decisions\nx\n\n## Migration\nNone.\n\n## Observability\nNone.\n\n## Living spec deltas\n### ADDED\n### MODIFIED\n### REMOVED\n\n## Open questions\n';

function standard(files = {}) {
  return tmpRepo({
    '.sdd/config.yaml': CONFIG,
    'docs/specs/bookings.md': LIVING,
    'docs/changes/c1/state.yaml': state('c1', 'standard', ['route']),
    'docs/changes/c1/delta.md': DELTA,
    'docs/changes/c1/tasks.md': TASKS,
    ...files,
  });
}

test('plan records spec and tasks in one act on standard (AC-1, AC-LIFE-5.5)', () => {
  const root = standard();
  const r = run(root, 'approve', 'c1', 'plan');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const s = stateOf(root, 'c1');
  const spec = s.match(/spec: (\{.*\})/)?.[1];
  const tasks = s.match(/tasks: (\{.*\})/)?.[1];
  assert.ok(spec && tasks, s);
  assert.equal(spec, tasks);
  assert.match(r.stdout, /Next: \/sdd:implement/);
});

test('plan records functional, spec and tasks on full (AC-2)', () => {
  const root = tmpRepo({
    '.sdd/config.yaml': CONFIG,
    'docs/changes/f1/state.yaml': state('f1', 'full', ['route']),
    'docs/changes/f1/functional.md': FUNCTIONAL,
    'docs/changes/f1/technical.md': TECHNICAL,
    'docs/changes/f1/tasks.md': TASKS,
  });
  const r = run(root, 'approve', 'f1', 'plan');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const s = stateOf(root, 'f1');
  for (const p of ['functional', 'spec', 'tasks']) assert.match(s, new RegExp(`\\n  ${p}: \\{ by: `));
});

test('plan refuses and writes nothing when tasks.md is missing (AC-3, AC-LIFE-5.6)', () => {
  const root = standard();
  fs.rmSync(path.join(root, 'docs/changes/c1/tasks.md'));
  const before = stateOf(root, 'c1');
  const r = run(root, 'approve', 'c1', 'plan');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /tasks\.md/);
  assert.equal(stateOf(root, 'c1'), before);
});

test('plan refuses and writes nothing when tasks.md fails validation (AC-3)', () => {
  const root = standard({ 'docs/changes/c1/tasks.md': TASKS.replace('- Covers: AC-1\n', '') });
  const before = stateOf(root, 'c1');
  const r = run(root, 'approve', 'c1', 'plan');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /V-TASK-FIELDS/);
  assert.equal(stateOf(root, 'c1'), before);
});

test('plan requires the route approval first', () => {
  const root = standard({ 'docs/changes/c1/state.yaml': state('c1', 'standard') });
  const r = run(root, 'approve', 'c1', 'plan');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /route/);
});

test('plan is refused on quick (AC-4)', () => {
  const root = tmpRepo({
    '.sdd/config.yaml': CONFIG,
    'docs/changes/q1/state.yaml': state('q1', 'quick', ['route']),
    'docs/changes/q1/brief.md': '# Brief\n',
  });
  const before = stateOf(root, 'q1');
  const r = run(root, 'approve', 'q1', 'plan');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /no "plan" approval/);
  assert.equal(stateOf(root, 'q1'), before);
});

test('plan with every planning phase already approved records nothing', () => {
  const root = standard({ 'docs/changes/c1/state.yaml': state('c1', 'standard', ['route', 'spec', 'tasks']) });
  const before = stateOf(root, 'c1');
  const r = run(root, 'approve', 'c1', 'plan');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /already approved/);
  assert.equal(stateOf(root, 'c1'), before);
});

// ---- status names the plan approval (REQ-LIFE-11, REQ-LIFE-14) ----

test('status asks for the plan approval once delta and tasks are written (AC-5)', () => {
  const root = standard();
  const r = run(root, 'status');
  assert.match(r.stdout, /next: \/sdd:approve c1 plan/);
});

test('status sends an unapproved delta on to tasks (AC-6)', () => {
  const root = standard();
  fs.rmSync(path.join(root, 'docs/changes/c1/tasks.md'));
  const r = run(root, 'status');
  assert.match(r.stdout, /next: \/sdd:tasks/);
});

test('status asks for the plan approval on full once every planning artifact exists', () => {
  const root = tmpRepo({
    '.sdd/config.yaml': CONFIG,
    'docs/changes/f1/state.yaml': state('f1', 'full', ['route']),
    'docs/changes/f1/functional.md': FUNCTIONAL,
  });
  assert.match(run(root, 'status').stdout, /next: \/sdd:spec/);
  fs.writeFileSync(path.join(root, 'docs/changes/f1/technical.md'), TECHNICAL);
  fs.writeFileSync(path.join(root, 'docs/changes/f1/tasks.md'), TASKS);
  assert.match(run(root, 'status').stdout, /next: \/sdd:approve f1 plan/);
});
