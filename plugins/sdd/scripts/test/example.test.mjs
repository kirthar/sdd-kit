// The bundled example must stay valid and demonstrate the three routes (acceptance evidence).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXAMPLE = path.resolve(HERE, '..', '..', '..', '..', 'examples', 'bookings');
const SDD = path.resolve(HERE, '..', 'sdd.mjs');
const archive = (id) => path.join(EXAMPLE, 'docs/changes/archive', id);

test('example validates cleanly', () => {
  const r = spawnSync('node', [SDD, 'validate', '--all'], { cwd: EXAMPLE, encoding: 'utf8', env: { ...process.env, SDD_OFFLINE: '1' } });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('example tests pass', () => {
  const r = spawnSync('node', ['--test'], { cwd: EXAMPLE, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('quick change produced no spec', () => {
  assert.deepEqual(fs.readdirSync(archive('20261015-fix-confirmation-typo')).sort(), ['brief.md', 'pr.md', 'state.yaml']);
});

test('standard and full deltas were integrated into living specs', () => {
  assert.match(fs.readFileSync(path.join(EXAMPLE, 'docs/specs/bookings.md'), 'utf8'), /### REQ-BOOK-3: Cancel a booking/);
  assert.match(fs.readFileSync(path.join(EXAMPLE, 'docs/specs/reviews.md'), 'utf8'), /### REQ-REV-1: Review a confirmed booking/);
  assert.ok(fs.existsSync(path.join(archive('20261015-booking-reviews'), 'contracts/reviews.yaml')));
});
