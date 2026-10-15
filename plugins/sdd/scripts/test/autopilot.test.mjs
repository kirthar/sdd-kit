import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpRepo, writeFiles, state } from './helpers.mjs';
import { acquireLock, releaseLock, eligible, tripwires, preflight, writeReport } from '../lib/autopilot.mjs';
import { releaseCheck } from '../lib/release-check.mjs';
import { autopilotActive, passLockDir } from '../lib/locks.mjs';
import { loadConfig } from '../lib/config.mjs';

const ENABLED = 'version: 1\nautopilot: { enabled: true, tripwires: { paths: ["src/auth/**"], keywords: [migration], max_files: 3 } }\n';
const DELTA = '# D\n\n## Why\nx\n\n## Reuse\nx\n\n## ADDED\n\n## MODIFIED\n\n## REMOVED\n\n## Acceptance criteria\n- AC-1 Given a, When b, Then c.\n- AC-2 Given a, When b, Then d.\n\n## Open questions\n';
const task = (n, { covers = 'AC-1', paths = 'src/bookings/**', deps = 'none', status = 'todo', title = `Task number ${n}` } = {}) =>
  `## T${n}: ${title}\n- Covers: ${covers}\n- Expected paths: ${paths}\n- Outermost test: behaviour at module level\n- Depends on: ${deps}\n- Package: .\n- Status: ${status}\n`;

function repo(tasksMd, approvals = ['route', 'spec', 'tasks'], config = ENABLED) {
  return tmpRepo({
    '.sdd/config.yaml': config,
    'docs/changes/20260101-a/state.yaml': state('20260101-a', 'standard', approvals),
    'docs/changes/20260101-a/delta.md': DELTA,
    'docs/changes/20260101-a/tasks.md': `# Tasks\n\n${tasksMd}`,
  });
}

test('lock: second acquire is skipped while the first is fresh (AC-AUTO-2.1)', () => {
  const root = repo(task(1));
  assert.equal(acquireLock(root).ok, true);
  assert.ok(autopilotActive(root));
  const second = acquireLock(root);
  assert.equal(second.ok, false);
  assert.equal(second.reason, 'locked');
  releaseLock(root);
  assert.ok(!fs.existsSync(passLockDir(root)));
});

test('lock: a stale lock is reclaimed', () => {
  const root = repo(task(1));
  acquireLock(root);
  const hb = path.join(passLockDir(root), 'heartbeat');
  const old = new Date(Date.now() - 2 * 60 * 60 * 1000);
  fs.utimesSync(hb, old, old);
  assert.equal(acquireLock(root).ok, true);
});

test('eligibility excludes tasks whose dependencies are unfinished (AC-AUTO-3.1)', () => {
  const root = repo(task(1) + '\n' + task(2, { covers: 'AC-2', deps: 'T1' }));
  const res = eligible(root);
  assert.deepEqual(res.eligible.map((t) => t.task), ['T1']);
  assert.deepEqual(res.excluded.find((t) => t.task === 'T2').reason, 'depends-on T1');
});

test('eligibility requires the tasks approval and skips done tasks', () => {
  assert.equal(eligible(repo(task(1), ['route', 'spec'])).eligible.length, 0);
  const root = repo(task(1, { status: 'done' }) + '\n' + task(2, { covers: 'AC-2', deps: 'T1' }));
  assert.deepEqual(eligible(root).eligible.map((t) => t.task), ['T2']);
});

test('eligibility excludes changes with a BLOCKING open question', () => {
  const root = repo(task(1));
  const f = path.join(root, 'docs/changes/20260101-a/delta.md');
  fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('## Open questions\n', '## Open questions\n- BLOCKING: which policy?\n'));
  assert.equal(eligible(root).eligible.length, 0);
});

test('tripwires fire on contracts, configured paths, keywords and size (AC-AUTO-4.1)', () => {
  const root = repo(task(1));
  const { config } = loadConfig(root);
  const fired = (t) => tripwires(config, { fields: { expected_paths: [], package: '.', ...t.fields }, title: t.title ?? 'x', id: 'T1' });
  assert.deepEqual(fired({ fields: { expected_paths: ['src/bookings/**'] } }), []);
  assert.ok(fired({ fields: { expected_paths: ['docs/changes/x/contracts/**'] } }).includes('contract'));
  assert.ok(fired({ fields: { expected_paths: ['src/auth/login.ts'] } }).includes('path:src/auth/**'));
  assert.ok(fired({ fields: { expected_paths: ['src/a'] }, title: 'Add migration for refunds' }).includes('keyword:migration'));
  assert.ok(fired({ fields: { expected_paths: ['a', 'b', 'c', 'd'] } }).includes('max-files'));
  assert.ok(fired({ fields: { expected_paths: [] } }).includes('unevaluable'));
  assert.ok(fired({ fields: { expected_paths: ['src/a'], package: 'api, web' } }).includes('multi-package'));
});

test('preflight refuses when autopilot is disabled (AC-AUTO-1.1)', () => {
  const root = repo(task(1), undefined, 'version: 1\n');
  const p = preflight(root, { probe: () => ({}) });
  assert.equal(p.mode, 'disabled');
  assert.match(p.message, /autopilot\.enabled: true/);
});

test('preflight: kill switch and missing permissions mean report-only (AC-AUTO-2.2)', () => {
  const root = repo(task(1));
  writeFiles(root, { '.sdd/local/pause': '' });
  assert.equal(preflight(root, { probe: () => ({ ghAuth: true, freeBytes: 1e10 }) }).mode, 'report-only');
  fs.rmSync(path.join(root, '.sdd/local/pause'));
  const p = preflight(root, { probe: () => ({ ghAuth: true, freeBytes: 1e10 }) });
  assert.equal(p.mode, 'report-only');
  assert.ok(p.reasons.some((r) => /permission/.test(r)));
  writeFiles(root, { '.claude/settings.json': JSON.stringify({ permissions: { allow: ['Bash(git add:*)', 'Bash(git commit:*)', 'Bash(gh pr create:*)'] } }) });
  assert.equal(preflight(root, { probe: () => ({ ghAuth: true, freeBytes: 1e10 }) }).mode, 'live');
});

test('report is always written with outcomes and deferred work (AC-AUTO-7.1)', () => {
  const root = repo(task(1));
  const file = writeReport(root, { outcomes: [{ task: '20260101-a/T1', result: 'draft PR opened' }], deferred: ['20260101-a/T2'], aborted: 'time budget' });
  const text = fs.readFileSync(file, 'utf8');
  assert.match(text, /time budget/);
  assert.match(text, /20260101-a\/T2/);
  assert.ok(file.includes(path.join('.sdd', 'local', 'autopilot')));
});

// ---- release check (REQ-REL) ----

function relRepo(prs) {
  return tmpRepo({
    '.sdd/config.yaml': 'version: 1\n',
    'docs/changes/c1/state.yaml': state('c1', 'standard', ['route', 'spec', 'tasks']).replace('prs: []', `prs: [${prs.join(', ')}]`),
    'docs/changes/c1/tasks.md': '# T\n',
  });
}

test('release check blocks on an open PR and names it (AC-REL-3.1)', () => {
  const root = relRepo(['https://example.invalid/pr/1', 'https://example.invalid/pr/2']);
  const gh = (url) => ({ state: url.endsWith('/2') ? 'OPEN' : 'MERGED', baseRefName: 'main' });
  const r = releaseCheck(root, { ids: ['c1'], gh });
  assert.equal(r.verdict, 'BLOCK');
  assert.match(r.lines.join('\n'), /pr\/2.*OPEN/);
});

test('release check warns when the forge cannot be queried (AC-REL-3.2)', () => {
  const root = relRepo(['https://example.invalid/pr/1']);
  const r = releaseCheck(root, { ids: ['c1'], gh: () => null });
  assert.equal(r.verdict, 'WARN');
  assert.match(r.lines.join('\n'), /not checked/);
});

test('release check warns for tasks without PRs and passes when all merged', () => {
  assert.equal(releaseCheck(relRepo([]), { ids: ['c1'], gh: () => null }).verdict, 'WARN');
  const ok = releaseCheck(relRepo(['https://example.invalid/pr/1']), { ids: ['c1'], gh: () => ({ state: 'MERGED', baseRefName: 'main' }) });
  assert.equal(ok.verdict, 'OK');
});
