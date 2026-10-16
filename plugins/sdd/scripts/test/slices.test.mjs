// Slices group tasks into stacked pull requests (REQ-LIFE-15).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tmpRepo, CONFIG, state } from './helpers.mjs';
import { validate } from '../lib/validate.mjs';

const DELTA = `# Delta: cancel\n\n## Why\nx\n\n## Reuse\n- src\n\n## ADDED\n\n## MODIFIED\n\n## REMOVED\n\n## Acceptance criteria\n- AC-1 Given a booking, When cancelled, Then it is cancelled.\n\n## Open questions\n`;
const task = (n, { slice, deps = 'none' } = {}) =>
  `## T${n}: Step ${n}\n- Covers: AC-1\n- Expected paths: src/**\n- Outermost test: step at module level\n- Depends on: ${deps}\n- Package: .\n${slice ? `- Slice: ${slice}\n` : ''}- Status: todo\n`;

function findings(...tasks) {
  const root = tmpRepo({
    '.sdd/config.yaml': CONFIG,
    'docs/changes/c1/state.yaml': state('c1', 'standard', ['route']),
    'docs/changes/c1/delta.md': DELTA,
    'docs/changes/c1/tasks.md': `# Tasks\n\n${tasks.join('\n')}`,
  });
  return validate(root, { id: 'c1' }).filter((f) => f.rule === 'V-SLICE');
}

test('tasks without slices pass (AC-13)', () => {
  assert.deepEqual(findings(task(1), task(2, { deps: 'T1' })), []);
});

test('contiguous slices in order pass', () => {
  assert.deepEqual(findings(task(1, { slice: 'S1' }), task(2, { slice: 'S1', deps: 'T1' }), task(3, { slice: 'S2', deps: 'T2' })), []);
});

test('only some tasks with a slice fails (AC-11)', () => {
  const f = findings(task(1, { slice: 'S1' }), task(2));
  assert.equal(f.length, 1);
  assert.equal(f[0].level, 'error');
  assert.match(f[0].message, /T2/);
});

test('a gap in slice numbers fails (AC-11)', () => {
  assert.match(findings(task(1, { slice: 'S1' }), task(2, { slice: 'S3' }))[0]?.message ?? '', /S2/);
});

test('slices that do not start at S1 fail', () => {
  assert.equal(findings(task(1, { slice: 'S2' })).length, 1);
});

test('interleaved slices fail', () => {
  assert.ok(findings(task(1, { slice: 'S1' }), task(2, { slice: 'S2' }), task(3, { slice: 'S1' })).length >= 1);
});

test('a malformed slice fails', () => {
  assert.equal(findings(task(1, { slice: 'one' })).length, 1);
});

test('depending on a later slice fails naming both tasks (AC-12)', () => {
  const f = findings(task(1, { slice: 'S1', deps: 'T2' }), task(2, { slice: 'S2' }));
  assert.equal(f.length, 1);
  assert.match(f[0].message, /T1[\s\S]*T2/);
});

test('slice pull request bodies are checked for AI attribution', () => {
  const root = tmpRepo({
    '.sdd/config.yaml': CONFIG,
    'docs/changes/c1/state.yaml': state('c1', 'standard', ['route']),
    'docs/changes/c1/delta.md': DELTA,
    'docs/changes/c1/tasks.md': `# Tasks\n\n${task(1)}`,
    'docs/changes/c1/pr-s2.md': '## Why\nx\n\nCo-Authored-By: Claude <noreply@anthropic.com>\n',
  });
  const hit = validate(root, { id: 'c1' }).find((f) => f.rule === 'V-ATTRIBUTION');
  assert.equal(hit?.file, 'docs/changes/c1/pr-s2.md');
});
