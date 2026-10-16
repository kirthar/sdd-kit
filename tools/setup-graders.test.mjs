// Setup eval cases are judged by deterministic graders that fail when the plugin is absent.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const cases = ['setup-jira-confluence', 'setup-github-issues', 'setup-linear'];
const grader = (name, file) =>
  fs.readFileSync(`plugins/sdd/evals/${name}/graders/${file}`, 'utf8');

for (const name of cases) {
  test(`${name} last message names /sdd:sync`, () => {
    const g = grader(name, 'names-sync.md');
    assert.match(g, /type: 'regex'/);
    assert.match(g, /pattern: '\/sdd:sync'/);
    assert.match(g, /target: 'last_message'/);
  });

  test(`${name} last message mentions the dry run`, () => {
    const g = grader(name, 'dry-run.md');
    assert.match(g, /type: 'regex'/);
    assert.match(g, /pattern: 'dry\[- \]run'/);
    assert.match(g, /target: 'last_message'/);
  });

  test(`${name} writes no kind: entry before confirmation`, () => {
    const g = grader(name, 'no-write-before-confirmation.md');
    assert.match(g, /pattern: 'kind:/);
    assert.match(g, /match: 'not_contains'/);
    assert.match(g, /path: "\.sdd\/config\.yaml"/);
  });
}

test('setup-github-issues traces gh auth status', () => {
  const g = grader('setup-github-issues', 'checks-gh-auth.md');
  assert.match(g, /type: 'tool_used'/);
  assert.match(g, /gh\\s\+auth\\s\+status/);
});
