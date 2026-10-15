import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpRepo, writeFiles, CONFIG, state } from './helpers.mjs';
import { readActive, writeActive, sddCommonDir } from '../lib/git.mjs';
import { approve } from '../lib/approve.mjs';
import { archive } from '../lib/archive.mjs';
import { tdd, readTddLog } from '../lib/tdd.mjs';
import { scan } from '../lib/scan.mjs';
import { context } from '../lib/context.mjs';
import { newChange } from '../lib/new.mjs';
import { status } from '../lib/status.mjs';

const SDD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'sdd.mjs');
const run = (cwd, ...args) => spawnSync('node', [SDD, ...args], { cwd, encoding: 'utf8', env: { ...process.env, SDD_OFFLINE: '1' } });

const LIVING = `---\nstatus: verified\n---\n# Bookings\n\n## Purpose\nBookings.\n\n## Requirements\n\n### REQ-BOOK-1: Create a booking\nOld text.\n\n### REQ-BOOK-2: Read a booking\nRead text.\n\n## History\n`;
const DELTA = (mod = 'REQ-BOOK-1') => `# Delta: cancel\n\n## Why\nx\n\n## Reuse\n- src\n\n## ADDED\n### REQ-BOOK-3: Cancel a booking\nCancel text.\n\n## MODIFIED\n### ${mod}: Create a booking\nNew text.\n\n## REMOVED\n- REQ-BOOK-2: replaced by search\n\n## Acceptance criteria\n- AC-1 Given a booking, When cancelled, Then it is cancelled.\n\n## Open questions\n`;
const TASKS = '# Tasks\n\n## T1: Add cancel\n- Covers: AC-1\n- Expected paths: src/**\n- Outermost test: cancel at module level\n- Depends on: none\n- Package: .\n- Status: todo\n';

function standard(approvals = ['route', 'spec', 'tasks'], delta = DELTA()) {
  return tmpRepo({
    '.sdd/config.yaml': CONFIG,
    'docs/specs/bookings.md': LIVING,
    'docs/changes/c1/state.yaml': state('c1', 'standard', approvals),
    'docs/changes/c1/delta.md': delta,
    'docs/changes/c1/tasks.md': TASKS,
  });
}

// ---- approve (REQ-LIFE-5) ----

test('approve records who and when, then prints the next command', () => {
  const root = standard(['route']);
  const r = approve(root, ['c1', 'spec'], { by: 'Person', now: '2026-02-02T00:00:00Z' });
  assert.equal(r.ok, true);
  assert.match(fs.readFileSync(path.join(root, 'docs/changes/c1/state.yaml'), 'utf8'), /spec: \{ by: Person, at: '?2026-02-02T00:00:00Z'? \}/);
  assert.match(r.message, /\/sdd:approve c1 tasks/);
});

test('approve refuses when the phase artifact fails validation (AC-LIFE-5.2)', () => {
  const root = standard(['route'], DELTA().replace('## Reuse\n- src\n', ''));
  const r = approve(root, ['c1', 'spec'], { by: 'P' });
  assert.equal(r.ok, false);
  assert.match(r.message, /V-SECTIONS/);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'docs/changes/c1/state.yaml'), 'utf8'), /spec:/);
});

test('approve rejects malformed ids and phases with exit 2 (AC-LIFE-5.3)', () => {
  const root = standard(['route']);
  const r = run(root, 'approve', 'c1;rm', 'spec');
  assert.equal(r.status, 2);
  assert.equal(run(root, 'approve', 'c1', 'everything').status, 2);
});

test('approve route can override the proposed route', () => {
  const root = tmpRepo({ '.sdd/config.yaml': CONFIG, 'docs/changes/q/state.yaml': state('q', 'full') });
  const r = approve(root, ['q', 'route', 'route=quick'], { by: 'P' });
  assert.equal(r.ok, true);
  const s = fs.readFileSync(path.join(root, 'docs/changes/q/state.yaml'), 'utf8');
  assert.match(s, /route: quick/);
  assert.match(s, /route_override: \{ from: full/);
});

test('approve plan:T1 records under approvals.plans', () => {
  const root = standard();
  writeFiles(root, { 'docs/changes/c1/plans/T1.md': '# Plan\n\n## Task\n## Approach\n## Files\n## Risks\n## Tripwires fired\n' });
  assert.equal(approve(root, ['c1', 'plan:T1'], { by: 'P' }).ok, true);
  assert.match(fs.readFileSync(path.join(root, 'docs/changes/c1/state.yaml'), 'utf8'), /plans:\n\s+T1:/);
});

// ---- new + status (REQ-LIFE-1, REQ-LIFE-11) ----

test('new creates the folder, state without approvals, brief for quick, and sets active', () => {
  const root = tmpRepo({ '.sdd/config.yaml': CONFIG });
  const r = newChange(root, { slug: 'fix-typo', route: 'quick', today: '20260301' });
  assert.equal(r.id, '20260301-fix-typo');
  const dir = path.join(root, 'docs/changes', r.id);
  assert.deepEqual(fs.readdirSync(dir).sort(), ['brief.md', 'state.yaml']);
  assert.equal(readActive(root), r.id);
  assert.match(r.message, /\/sdd:approve 20260301-fix-typo route/);
});

test('status names the next command for each open change (AC-LIFE-11.1)', () => {
  const root = standard(['route', 'spec']);
  fs.rmSync(path.join(root, 'docs/changes/c1/tasks.md'));
  const s = status(root);
  assert.equal(s.changes[0].next, '/sdd:tasks');
});

test('status reports the single open change active when the pointer is stale (AC-4, AC-5)', () => {
  const root = tmpRepo({ '.sdd/config.yaml': CONFIG, 'docs/changes/b/state.yaml': state('b', 'quick') });
  writeActive(root, 'a');
  const s = status(root);
  assert.equal(s.active, 'b');
  assert.equal(s.changes[0].active, true);
  writeFiles(root, { 'docs/changes/c/state.yaml': state('c', 'quick') });
  const two = status(root);
  assert.equal(two.active, null);
  assert.ok(two.changes.every((c) => !c.active));
});

test('context names the single open change when the pointer is stale', () => {
  const root = tmpRepo({ '.sdd/config.yaml': CONFIG, 'docs/changes/b/state.yaml': state('b', 'quick') });
  writeActive(root, 'a');
  assert.match(context(root), /Active change: b \(quick\)/);
});

// ---- archive (REQ-VAL-2) ----

test('archive applies deltas deterministically and moves the folder (AC-VAL-2.2)', () => {
  const root = standard();
  const r = archive(root, 'c1', { mergedConfirmed: true, today: '2026-03-01' });
  assert.equal(r.ok, true, r.message);
  const spec = fs.readFileSync(path.join(root, 'docs/specs/bookings.md'), 'utf8');
  assert.equal(spec, `---\nstatus: verified\n---\n# Bookings\n\n## Purpose\nBookings.\n\n## Requirements\n\n### REQ-BOOK-1: Create a booking\nNew text.\n\n### REQ-BOOK-3: Cancel a booking\nCancel text.\n\n## History\n- 2026-03-01 c1: REQ-BOOK-2 removed — replaced by search\n`);
  assert.ok(fs.existsSync(path.join(root, 'docs/changes/archive/c1/state.yaml')));
  assert.ok(!fs.existsSync(path.join(root, 'docs/changes/c1')));
});

test('archive with an unknown MODIFIED target changes nothing (AC-VAL-2.1)', () => {
  const root = standard(['route', 'spec', 'tasks'], DELTA('REQ-BOOK-9'));
  const before = fs.readFileSync(path.join(root, 'docs/specs/bookings.md'), 'utf8');
  const r = archive(root, 'c1', { mergedConfirmed: true });
  assert.equal(r.ok, false);
  assert.match(r.message, /REQ-BOOK-9/);
  assert.equal(fs.readFileSync(path.join(root, 'docs/specs/bookings.md'), 'utf8'), before);
  assert.ok(fs.existsSync(path.join(root, 'docs/changes/c1')));
});

test('archive of a quick change only moves the folder (AC-VAL-2.3)', () => {
  const root = tmpRepo({ '.sdd/config.yaml': CONFIG, 'docs/specs/bookings.md': LIVING, 'docs/changes/q/state.yaml': state('q', 'quick', ['route']) });
  assert.equal(archive(root, 'q', { mergedConfirmed: true }).ok, true);
  assert.equal(fs.readFileSync(path.join(root, 'docs/specs/bookings.md'), 'utf8'), LIVING);
  assert.ok(fs.existsSync(path.join(root, 'docs/changes/archive/q')));
});

test('archive refuses without merge confirmation when no forge is available', () => {
  const root = standard();
  const r = archive(root, 'c1', {});
  assert.equal(r.ok, false);
  assert.match(r.message, /merged/);
});

// ---- tdd (REQ-VAL-4) ----

test('tdd red that passes exits 1 (AC-VAL-4.1)', () => {
  const root = standard();
  writeActive(root, 'c1');
  const r = tdd(root, 'red', ['node', '-e', 'process.exit(0)']);
  assert.equal(r.exitCode, 1);
  assert.match(r.message, /expected failure, got success/);
});

test('tdd records red then green in the shared log', () => {
  const root = standard();
  writeActive(root, 'c1');
  assert.equal(tdd(root, 'red', ['node', '-e', 'process.exit(3)']).exitCode, 0);
  assert.equal(tdd(root, 'green', ['node', '-e', 'process.exit(0)']).exitCode, 0);
  const log = readTddLog(root, 'c1');
  assert.deepEqual(log.map((e) => e.phase), ['red', 'green']);
  assert.ok(fs.existsSync(path.join(sddCommonDir(root), 'tdd', 'c1.log')));
});

test('tdd logs under the single open change when the pointer is stale (AC-18)', () => {
  const root = tmpRepo({ '.sdd/config.yaml': CONFIG, 'docs/changes/b/state.yaml': state('b', 'quick') });
  writeActive(root, 'a');
  assert.equal(tdd(root, 'red', ['node', '-e', 'process.exit(3)']).exitCode, 0);
  assert.deepEqual(readTddLog(root, 'b').map((e) => e.phase), ['red']);
  assert.deepEqual(readTddLog(root, 'a'), []);
});

test('tdd log prints recorded runs in order with exit codes (AC-9)', () => {
  const root = standard();
  writeActive(root, 'c1');
  tdd(root, 'red', ['node', '-e', 'process.exit(3)']);
  tdd(root, 'green', ['node', '-e', 'process.exit(0)']);
  const r = run(root, 'tdd', 'log', 'c1');
  assert.equal(r.status, 0);
  const lines = r.stdout.trim().split('\n');
  assert.equal(lines.length, 2);
  assert.match(lines[0], /red.*exit 3/);
  assert.match(lines[1], /green.*exit 0/);
});

test('tdd log says no runs recorded for an empty or unknown id (AC-10)', () => {
  const root = standard();
  for (const args of [['tdd', 'log', 'c1'], ['tdd', 'log', 'nope'], ['tdd', 'log']]) {
    const r = run(root, ...args);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /no runs recorded/);
  }
});

// ---- scan (REQ-VAL-3) ----

test('scan reports each family by rule and location, never the value (AC-VAL-3.1)', () => {
  const values = {
    'private-key': `-----BEGIN ${'RSA'} PRIVATE KEY-----`,
    'cloud-key': `${'AK'}IA${'ABCDEFGHIJKLMNOP'}`,
    'forge-token': `${'gh'}p_${'Ab3'.repeat(12)}`,
    'chat-token': `${'xo'}xb-${'1234567890'}-${'abcdefghij'}`,
    jwt: `${'ey'}J${'a'.repeat(20)}.${'b'.repeat(20)}.${'c'.repeat(20)}`,
    assignment: `api_key = "${'aB3dE6gH9jK2'}${'mN5pQ8sT1vW4'}"`,
  };
  const root = tmpRepo(Object.fromEntries(Object.entries(values).map(([k, v]) => [`f/${k}.txt`, `x\n${v}\n`])));
  const r = scan(root, { files: Object.keys(values).map((k) => `f/${k}.txt`) });
  assert.equal(r.findings.length, 6);
  const out = JSON.stringify(r);
  for (const v of Object.values(values)) assert.ok(!out.includes(v));
  for (const f of r.findings) assert.equal(f.line, 2);
});

// ---- context (REQ-RULE-3) ----

test('context prints active change, constitution and rules (AC-RULE-3.1)', () => {
  const root = standard(['route', 'spec']);
  writeActive(root, 'c1');
  writeFiles(root, {
    '.sdd/constitution.md': '# Constitution\n\n## Invariants\n| ID | Invariant |\n',
    '.sdd/rules.md': [1, 2, 3].map((n) => `## R${n}: Rule ${n}\n- Why: w${n}\n- How to apply: apply ${n}\n- Added: 2026-01-01\n`).join('\n'),
  });
  const out = context(root);
  assert.match(out, /Active change: c1 \(standard\)/);
  assert.match(out, /Next: \/sdd:approve c1 tasks|Next: \/sdd:tasks/);
  for (const n of [1, 2, 3]) {
    assert.match(out, new RegExp(`R${n}: Rule ${n}`));
    assert.match(out, new RegExp(`apply ${n}`));
  }
});

test('context without .sdd prints an init hint (AC-RULE-3.2)', () => {
  const root = tmpRepo();
  const r = run(root, 'context');
  assert.equal(r.status, 0);
  assert.match(r.stdout, /\/sdd:init/);
});

test('context for a quick change lists rule titles only', () => {
  const root = tmpRepo({ '.sdd/config.yaml': CONFIG, 'docs/changes/q/state.yaml': state('q', 'quick', ['route']), '.sdd/rules.md': '## R1: Keep it\n- Why: w\n- How to apply: secret detail\n' });
  writeActive(root, 'q');
  const out = context(root);
  assert.match(out, /R1: Keep it/);
  assert.doesNotMatch(out, /secret detail/);
});

// ---- CLI ----

test('cli validate exits 1 on errors and prints rule ids', () => {
  const root = standard(['route', 'spec'], DELTA().replace('## Reuse\n- src\n', ''));
  const r = run(root, 'validate', '--all');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /V-SECTIONS docs\/changes\/c1\/delta\.md/);
});

test('cli --json output is machine-readable', () => {
  const root = standard();
  const r = run(root, 'validate', '--all', '--json');
  assert.equal(r.status, 0);
  assert.deepEqual(JSON.parse(r.stdout).findings, []);
});

test('cli unknown subcommand exits 2', () => {
  assert.equal(run(tmpRepo(), 'frobnicate').status, 2);
});

test('approve refuses a phase whose artifact does not exist', () => {
  const root = standard(['route', 'spec']);
  fs.rmSync(path.join(root, 'docs/changes/c1/tasks.md'));
  const r = approve(root, ['c1', 'tasks'], { by: 'P' });
  assert.equal(r.ok, false);
  assert.match(r.message, /tasks\.md/);
});

test('approve refuses out of order: tasks before spec', () => {
  const root = standard(['route']);
  const r = approve(root, ['c1', 'tasks'], { by: 'P' });
  assert.equal(r.ok, false);
  assert.match(r.message, /spec/);
});

test('archive applies full-route living spec deltas and creates a new capability spec', () => {
  const technical = `# Technical\n\n## Reuse\nx\n\n## Contracts\nx\n\n## Rules\nx\n\n## Decisions\nx\n\n## Migration\nNone.\n\n## Observability\nNone.\n\n## Living spec deltas\n### ADDED\n### REQ-REV-1: Review a booking\nOne review per booking.\n\n### REQ-REV-2: Reject invalid reviews\nRatings 1 to 5.\n\n### MODIFIED\n### REMOVED\n\n## Open questions\n`;
  const root = tmpRepo({
    '.sdd/config.yaml': CONFIG,
    'docs/specs/bookings.md': LIVING,
    'docs/changes/f1/state.yaml': state('f1', 'full', ['route', 'functional', 'spec', 'tasks']).replace('[bookings]', '[reviews]'),
    'docs/changes/f1/functional.md': '# F\n\n## Problem\nx\n\n## Scope\nx\n\n## Out of scope\nx\n\n## Acceptance criteria\n- AC-1 Given a, When b, Then c.\n\n## Open questions\n',
    'docs/changes/f1/technical.md': technical,
    'docs/changes/f1/tasks.md': TASKS,
  });
  const r = archive(root, 'f1', { mergedConfirmed: true });
  assert.equal(r.ok, true, r.message);
  const spec = fs.readFileSync(path.join(root, 'docs/specs/reviews.md'), 'utf8');
  assert.match(spec, /### REQ-REV-1: Review a booking\nOne review per booking\./);
  assert.match(spec, /### REQ-REV-2: Reject invalid reviews/);
});

// ---- new: branch per change (REQ-LIFE-1; AC-1, AC-2, AC-3, AC-13) ----

const git = (cwd, ...args) => spawnSync('git', ['-c', 'user.name=T', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8' });
const branchOf = (cwd) => git(cwd, 'branch', '--show-current').stdout.trim();
function committedRepo() {
  const root = tmpRepo({ '.sdd/config.yaml': CONFIG, 'src.txt': 'one\n' });
  git(root, 'add', '--', '.sdd/config.yaml', 'src.txt');
  git(root, 'commit', '-q', '-m', 'init');
  return root;
}

test('sdd new on the base branch lands on sdd/<id> with folder and pointer (AC-1)', () => {
  const root = committedRepo();
  const r = run(root, 'new', 'fix-typo', '--route', 'quick');
  assert.equal(r.status, 0, r.stderr);
  const id = readActive(root);
  assert.match(id, /-fix-typo$/);
  assert.equal(branchOf(root), `sdd/${id}`);
  assert.ok(fs.existsSync(path.join(root, 'docs/changes', id, 'state.yaml')));
});

test('sdd new stays on a feature branch (AC-2)', () => {
  const root = committedRepo();
  git(root, 'switch', '-q', '-c', 'feature/x');
  const r = run(root, 'new', 'fix-typo', '--route', 'quick');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(branchOf(root), 'feature/x');
  assert.ok(readActive(root));
});

test('sdd new stops with nothing created when sdd/<id> exists (AC-3)', () => {
  const root = committedRepo();
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  git(root, 'branch', `sdd/${today}-fix-typo`);
  const r = run(root, 'new', 'fix-typo', '--route', 'quick');
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, new RegExp(`sdd/${today}-fix-typo`));
  assert.equal(branchOf(root), 'main');
  assert.equal(fs.existsSync(path.join(root, 'docs/changes')), false);
  assert.equal(readActive(root), null);
});

test('sdd new stops with nothing created when the switch fails on a dirty tree (AC-13)', () => {
  const root = committedRepo();
  fs.writeFileSync(path.join(root, 'src.txt'), 'dirty\n');
  const r = run(root, 'new', 'fix-typo', '--route', 'quick');
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /dirty|uncommitted/i);
  assert.equal(branchOf(root), 'main');
  assert.equal(fs.existsSync(path.join(root, 'docs/changes')), false);
  assert.equal(readActive(root), null);
});
