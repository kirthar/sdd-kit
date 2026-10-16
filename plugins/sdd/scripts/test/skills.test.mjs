// Skills run the flow without stops between the person's approvals (REQ-LIFE-14, AC-15).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const skill = (name) => fs.readFileSync(path.join(PLUGIN, 'skills', name, 'SKILL.md'), 'utf8');
const read = (rel) => fs.readFileSync(path.join(PLUGIN, rel), 'utf8');

const FLOW = ['approve', 'new', 'refine', 'spec', 'tasks', 'implement', 'verify', 'test-plan', 'pr'];

test('no flow skill stops to offer or suggest the next step (AC-15)', () => {
  for (const name of FLOW) {
    const text = skill(name);
    assert.doesNotMatch(text, /offer to continue/i, name);
    assert.doesNotMatch(text, /Stop after one task/i, name);
    assert.doesNotMatch(text, /\bsuggest `?\/sdd:/i, name);
  }
});

test('approve continues with the next command in the same turn', () => {
  assert.match(skill('approve'), /continue[^.]*same turn/i);
  assert.match(skill('approve'), /\bplan\b/);
});

test('planning skills chain into one plan approval (AC-LIFE-14.1)', () => {
  assert.match(skill('refine'), /every clarification question/i);
  assert.match(skill('refine'), /\/sdd:spec/);
  assert.doesNotMatch(skill('refine'), /\/sdd:approve <id> functional/);
  assert.match(skill('spec'), /\/sdd:tasks/);
  assert.doesNotMatch(skill('spec'), /require the `functional` approval/i);
  assert.match(skill('tasks'), /\/sdd:approve <id> plan/);
  assert.doesNotMatch(skill('tasks'), /Requires the `spec` approval/);
});

test('implement runs every remaining task, then verify (AC-LIFE-14.2)', () => {
  const text = skill('implement');
  assert.match(text, /every remaining task/i);
  assert.match(text, /\/sdd:verify/);
});

test('verify and test-plan continue to the pull request', () => {
  assert.match(skill('verify'), /\/sdd:test-plan/);
  assert.match(skill('verify'), /\/sdd:pr/);
  assert.match(skill('test-plan'), /\/sdd:pr/);
});

test('pr marks the PR ready after a GO verification when pr.auto_ready (AC-LIFE-9.1, AC-LIFE-9.3)', () => {
  const text = skill('pr');
  assert.match(text, /gh pr ready/);
  assert.match(text, /pr\.auto_ready/);
  assert.match(text, /GO/);
  assert.doesNotMatch(text, /Never mark ready/);
});

test('commits and PR bodies carry no AI attribution', () => {
  for (const text of [skill('implement'), skill('pr'), read('references/pr-description.md'), read('templates/agents-section.md'), read('agents/sdd-implementer.md')]) {
    assert.match(text, /AI (assistant|attribution)|co-author/i);
  }
});

test('the agents section names the two interaction points and ready PRs', () => {
  const text = read('templates/agents-section.md');
  assert.match(text, /\/sdd:approve <id> plan/);
  assert.match(text, /ready for review/i);
});

// ---- stacked slices and semantic titles (REQ-LIFE-15, REQ-LIFE-16, AC-14, AC-15) ----

test('tasks groups tasks into slices by the size budget (AC-14)', () => {
  const text = skill('tasks');
  assert.match(text, /pr\.max_lines/);
  assert.match(text, /Slice: S<n>/);
});

test('implement works slice by slice on stacked branches (AC-14)', () => {
  const text = skill('implement');
  assert.match(text, /slice by slice/i);
  assert.match(text, /sdd\/<id>-s<k>/);
});

test('verify checks the criteria of the current slice', () => {
  assert.match(skill('verify'), /slice/i);
});

test('pr opens one stacked PR per slice and restacks after a merge (AC-14)', () => {
  const text = skill('pr');
  assert.match(text, /sdd\.mjs" size/);
  assert.match(text, /pr-s<k>\.md/);
  assert.match(text, /--base sdd\/<id>/);
  assert.match(text, /sdd\.mjs" restack/);
  assert.match(text, /gh pr edit <url> --base <base_branch>/);
});

test('pr titles follow commit.format and over-budget bodies explain their size (AC-15)', () => {
  const text = skill('pr');
  assert.match(text, /commit\.format/);
  assert.match(text, /## Size/);
  const tpl = read('templates/pr.md');
  assert.match(tpl, /Slice <k> of <n>/);
  assert.match(tpl, /## Size/);
  assert.match(read('references/pr-description.md'), /squash commit/i);
});

// ---- conflict-free pull requests (REQ-LIFE-17, REQ-VAL-8, REQ-VAL-9, AC-10) ----

test('pr restacks with sdd restack instead of merging the base directly', () => {
  const text = skill('pr');
  assert.match(text, /sdd\.mjs" restack --squash/);
  assert.match(text, /--slice-head/);
  assert.doesNotMatch(text, /git merge origin\/<base_branch>/);
});

test('pr runs the conflict check before marking ready', () => {
  const text = skill('pr');
  assert.match(text, /sdd\.mjs" conflicts/);
  assert.ok(text.indexOf('conflicts') < text.indexOf('gh pr ready'), 'conflict check comes before gh pr ready');
});

test('release notes go to the change changelog, never the project changelog', () => {
  for (const name of ['implement', 'pr']) {
    assert.match(skill(name), /changelog\.md/, name);
    assert.match(skill(name), /never edit[^.]*project changelog/i, name);
  }
  assert.match(skill('archive'), /changelog/i);
  assert.match(read('templates/changelog.md'), /### Added/);
});
