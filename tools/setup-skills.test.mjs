// Each setup skill must explain /sdd:sync before its first check, so every exit path shows it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const skills = ['setting-up-jira-confluence', 'setting-up-github-issues', 'setting-up-linear'];

for (const name of skills) {
  test(`${name} explains sync before its first check`, () => {
    const text = fs.readFileSync(`plugins/sdd/skills/${name}/SKILL.md`, 'utf8');
    const firstStep = text.search(/^1\. /m);
    assert.ok(firstStep > 0, 'first numbered step not found');
    const intro = text.slice(0, firstStep);
    assert.match(intro, /\/sdd:sync/);
    assert.match(intro, /dry[- ]run/i);
    assert.match(intro, /nothing is written before confirmation/i);
  });
}
