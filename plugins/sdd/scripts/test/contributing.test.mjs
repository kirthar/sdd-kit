import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const doc = fs.readFileSync(new URL('../../../../CONTRIBUTING.md', import.meta.url), 'utf8');

test('CONTRIBUTING loads the plugin from the main checkout, not the worktree being edited', () => {
  assert.ok(!doc.includes('--plugin-dir ./plugins/sdd'));
  assert.ok(doc.includes('--plugin-dir <main checkout>/plugins/sdd'));
});
