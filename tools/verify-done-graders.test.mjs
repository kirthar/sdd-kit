// The verify-done eval case is judged by deterministic graders that fail when the plugin is absent.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const grader = (file) =>
  fs.readFileSync(`plugins/sdd/evals/verify-done/graders/${file}`, 'utf8');

test('verify-done finds a verification.md written by the skill', () => {
  const g = grader('verification-written.md');
  assert.match(g, /type: 'file_exists'/);
  assert.match(g, /path: 'docs\/changes\/\*\/verification\.md'/);
});

test('verify-done verification.md names AC-1 and AC-2', () => {
  const g = grader('names-missing-criteria.md');
  assert.match(g, /type: 'regex'/);
  assert.match(g, /AC-1\[\\s\\S\]\*AC-2\|AC-2\[\\s\\S\]\*AC-1/);
  assert.match(
    g,
    /path: "docs\/changes\/20260101-cancel-booking\/verification\.md"/,
  );
});
