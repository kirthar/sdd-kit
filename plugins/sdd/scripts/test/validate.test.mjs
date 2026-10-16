import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpRepo, writeFiles, CONFIG, state } from './helpers.mjs';
import { validate } from '../lib/validate.mjs';
import { countLines, criteria, tasks, openQuestions } from '../lib/markdown.mjs';

const PLUGIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
process.env.SDD_OFFLINE = '1';

const DELTA = `# Delta: cancel

## Why
Guests cancel.

## Reuse
- src/bookings.js

## ADDED
### REQ-BOOK-3: Cancel a booking
Cancelled bookings have status cancelled.

## MODIFIED

## REMOVED

## Acceptance criteria
- AC-1 Given a confirmed booking, When the guest cancels it, Then its status is cancelled.
- AC-2 Given an unknown id, When the guest cancels it,
  Then an error says it was not found.

## Open questions
`;

const TASKS = `# Tasks

## T1: Add cancel to the bookings module
- Covers: AC-1, AC-2
- Expected paths: src/**
- Outermost test: cancelling a booking at module level
- Depends on: none
- Package: .
- Status: todo
`;

const LIVING = `---
status: verified
---
# Bookings

## Purpose
Bookings.

## Requirements

### REQ-BOOK-1: Create a booking
Text.

## History
`;

function repo(extra = {}) {
  return tmpRepo({
    '.sdd/config.yaml': CONFIG,
    '.sdd/constitution.md': '# Constitution\n',
    'docs/specs/bookings.md': LIVING,
    'docs/changes/c1/state.yaml': state('c1', 'standard', ['route', 'spec']),
    'docs/changes/c1/delta.md': DELTA,
    'docs/changes/c1/tasks.md': TASKS,
    ...extra,
  });
}

const rules = (f) => f.filter((x) => x.level === 'error').map((x) => x.rule);

test('a clean standard change has zero findings (AC-VAL-1.4)', () => {
  assert.deepEqual(validate(repo(), { all: true }), []);
});

test('task without Covers fails with path and line (AC-VAL-1.1)', () => {
  const root = repo({ 'docs/changes/c1/tasks.md': TASKS.replace('- Covers: AC-1, AC-2\n', '') });
  const f = validate(root, { id: 'c1' }).find((x) => x.rule === 'V-TASK-FIELDS');
  assert.ok(f);
  assert.equal(f.file, 'docs/changes/c1/tasks.md');
  assert.equal(f.line, 3);
  assert.match(f.message, /Covers/);
});

test('uncovered criterion fails V-TRACE naming it (AC-VAL-1.2)', () => {
  const root = repo({ 'docs/changes/c1/tasks.md': TASKS.replace('AC-1, AC-2', 'AC-1') });
  const f = validate(root, { id: 'c1' }).find((x) => x.rule === 'V-TRACE');
  assert.match(f.message, /AC-2/);
});

test('task covering a missing criterion fails V-TRACE', () => {
  const root = repo({ 'docs/changes/c1/tasks.md': TASKS.replace('AC-1, AC-2', 'AC-1, AC-2, AC-9') });
  assert.ok(validate(root, { id: 'c1' }).some((x) => x.rule === 'V-TRACE' && /AC-9/.test(x.message)));
});

test('criterion without When fails V-AC-FORMAT', () => {
  const root = repo({ 'docs/changes/c1/delta.md': DELTA.replace('When the guest cancels it, Then its', 'then its') });
  assert.ok(rules(validate(root, { id: 'c1' })).includes('V-AC-FORMAT'));
});

test('quick change with a spec artifact fails V-QUICK', () => {
  const root = repo({
    'docs/changes/q1/state.yaml': state('q1', 'quick', ['route']),
    'docs/changes/q1/brief.md': '# Brief\n\n## Problem\nx\n\n## Expected behaviour\ny\n\n## Proving test\nz\n',
    'docs/changes/q1/delta.md': DELTA,
  });
  assert.ok(rules(validate(root, { id: 'q1' })).includes('V-QUICK'));
});

test('missing required section fails V-SECTIONS', () => {
  const root = repo({ 'docs/changes/c1/delta.md': DELTA.replace('## Reuse\n- src/bookings.js\n', '') });
  const f = validate(root, { id: 'c1' }).find((x) => x.rule === 'V-SECTIONS');
  assert.match(f.message, /Reuse/);
});

test('project template override wins and is enforced (AC-TPL-2.1)', () => {
  const tpl = fs.readFileSync(path.join(PLUGIN, 'templates', 'delta.md'), 'utf8').replace('required: [', 'required: [Rollout, ');
  const root = repo({ '.sdd/templates/delta.md': tpl });
  assert.ok(validate(root, { id: 'c1' }).some((x) => x.rule === 'V-SECTIONS' && /Rollout/.test(x.message)));
});

test('size budget: warn above budget, error above 1.5x (AC-TPL-1.1)', () => {
  const brief = (n) => `# Brief\n\n## Problem\n${'line\n'.repeat(n - 6)}\n## Expected behaviour\ny\n\n## Proving test\nz\n`;
  const at = (n) => validate(repo({
    'docs/changes/q1/state.yaml': state('q1', 'quick', ['route']),
    'docs/changes/q1/brief.md': brief(n),
  }), { id: 'q1' }).filter((x) => x.rule === 'V-SIZE');
  assert.equal(at(15).length, 0);
  assert.equal(at(20)[0].level, 'warn');
  assert.equal(at(23)[0].level, 'error');
});

test('count ignores code blocks, comments, frontmatter and blank lines', () => {
  assert.equal(countLines('---\na: 1\n---\n# T\n\n<!-- c\nc -->\n```\nx\ny\n```\ntext\n'), 2);
});

test('approval with an open BLOCKING question fails V-OPEN-Q', () => {
  const root = repo({ 'docs/changes/c1/delta.md': DELTA.replace('## Open questions\n', '## Open questions\n- BLOCKING: refund policy?\n') });
  assert.ok(rules(validate(root, { id: 'c1' })).includes('V-OPEN-Q'));
});

test('NON-BLOCKING questions do not block approval', () => {
  const root = repo({ 'docs/changes/c1/delta.md': DELTA.replace('## Open questions\n', '## Open questions\n- NON-BLOCKING: copy wording — blocks: T1\n') });
  assert.ok(!rules(validate(root, { id: 'c1' })).includes('V-OPEN-Q'));
});

test('delta must modify existing and add new requirement IDs (V-DELTA)', () => {
  const bad = DELTA.replace('### REQ-BOOK-3', '### REQ-BOOK-1').replace('## MODIFIED\n', '## MODIFIED\n### REQ-BOOK-9: Ghost\nx\n');
  const f = validate(repo({ 'docs/changes/c1/delta.md': bad }), { id: 'c1' }).filter((x) => x.rule === 'V-DELTA');
  assert.equal(f.length, 2);
});

test('state schema: unknown route and approval for a phase the route lacks (V-STATE)', () => {
  const root = repo({ 'docs/changes/c2/state.yaml': 'id: c2\nroute: medium\napprovals: {}\n' });
  assert.ok(rules(validate(root, { id: 'c2' })).includes('V-STATE'));
  const root2 = repo({ 'docs/changes/c3/state.yaml': state('c3', 'quick', ['route', 'functional']) });
  assert.ok(rules(validate(root2, { id: 'c3' })).includes('V-STATE'));
});

test('heading with punctuation fails V-HEADING (AC-TPL-4.1)', () => {
  const root = repo({ 'docs/changes/c1/tasks.md': TASKS.replace('## T1: Add cancel to the bookings module', '## T2: Add /cancel endpoint') });
  assert.ok(rules(validate(root, { id: 'c1' })).includes('V-HEADING'));
});

test('invalid contract fails in structural mode (AC-VAL-1.3)', () => {
  const root = repo({
    'docs/changes/f1/state.yaml': state('f1', 'full', ['route']),
    'docs/changes/f1/contracts/api.yaml': 'openapi: 2.0\npaths: {}\n',
  });
  const f = validate(root, { id: 'f1' }).find((x) => x.rule === 'V-OPENAPI');
  assert.ok(f);
  assert.match(f.message, /mode: structural/);
});

test('valid contract passes structural mode', () => {
  const root = repo({
    'docs/changes/f1/state.yaml': state('f1', 'full', ['route']),
    'docs/changes/f1/contracts/api.yaml': 'openapi: 3.0.3\ninfo: { title: t, version: "1" }\npaths:\n  /b:\n    get:\n      responses:\n        "200": { $ref: "#/components/responses/Ok" }\ncomponents:\n  responses:\n    Ok: { description: ok }\n',
  });
  assert.ok(!validate(root, { id: 'f1' }).some((x) => x.rule === 'V-OPENAPI'));
});

test('unresolvable local $ref fails', () => {
  const root = repo({
    'docs/changes/f1/state.yaml': state('f1', 'full', ['route']),
    'docs/changes/f1/contracts/api.yaml': 'openapi: 3.1.0\ninfo: { title: t, version: "1" }\npaths:\n  /b:\n    get:\n      responses:\n        "200": { $ref: "#/components/responses/Missing" }\n',
  });
  assert.ok(validate(root, { id: 'f1' }).some((x) => x.rule === 'V-OPENAPI' && /Missing/.test(x.message)));
});

test('unverified living spec is a warning (V-UNVERIFIED)', () => {
  const root = repo({ 'docs/specs/bookings.md': LIVING.replace('verified', 'unverified') });
  const f = validate(root, { specs: true });
  assert.ok(f.some((x) => x.rule === 'V-UNVERIFIED' && x.level === 'warn'));
});

test('rules file: duplicate IDs fail V-RULES (AC-RULE-1.1)', () => {
  const r = '# Rules\n\n## R1: Do a\n- Why: x\n- How to apply: y\n- Added: 2026-01-01\n\n## R1: Do b\n- Why: x\n- How to apply: y\n- Added: 2026-01-01\n';
  assert.ok(rules(validate(repo({ '.sdd/rules.md': r }), { all: true })).includes('V-RULES'));
});

test('leaks: home paths, emails and tokens fail V-LEAK', () => {
  // Built at runtime so the repository never contains a literal that looks like a real leak.
  const leak = `see ${'/Us' + 'ers'}/someone/x and ${'a' + '@'}b.com and ${'gh' + 'p_'}${'x'.repeat(36)}\n`;
  const root = repo({ 'docs/notes.md': leak });
  assert.equal(validate(root, { all: true }).filter((x) => x.rule === 'V-LEAK').length, 3);
});

test('config errors surface as V-CONFIG', () => {
  const root = repo({ '.sdd/config.yaml': 'version: 1\ntesting: { tdd: sometimes }\n' });
  assert.ok(rules(validate(root, { all: true })).includes('V-CONFIG'));
});

test('default templates carry writing rules and required headings (AC-TPL-3.1)', () => {
  assert.deepEqual(validate(repo(), { templates: true }).filter((x) => x.level === 'error'), []);
});

test('markdown helpers parse criteria, tasks and questions', () => {
  assert.deepEqual(criteria(DELTA).map((c) => c.id), ['AC-1', 'AC-2']);
  const [t] = tasks(TASKS);
  assert.equal(t.id, 'T1');
  assert.deepEqual(t.fields.covers, ['AC-1', 'AC-2']);
  assert.deepEqual(openQuestions('## Open questions\n- BLOCKING: a\n- NON-BLOCKING: b\n').map((q) => q.blocking), [true, false]);
});

// ---------- constitution (AC-INIT-5.1) ----------

const HEAD = '# Constitution\n\n## Invariants\n| ID | Invariant | Violated when | Evidence |\n|---|---|---|---|\n';
const ROW = '| K1 | Files first | A command needs a service | `src/bookings.js` |\n';
const constitution = (body, extra = {}) => repo({
  '.sdd/constitution.md': HEAD + body,
  'src/bookings.js': 'export {};\n',
  ...extra,
});
const found = (root) => validate(root, { all: true }).filter((x) => x.rule === 'V-CONSTITUTION');

test('a sound constitution passes V-CONSTITUTION', () => {
  assert.deepEqual(found(constitution(ROW)), []);
});

test('constitution over 40 counted lines is an error', () => {
  const rows = Array.from({ length: 40 }, (_, i) => `| K${i + 1} | Rule | Broken when x | \`src/bookings.js\` |\n`).join('');
  const f = found(constitution(rows));
  assert.equal(f.length, 1);
  assert.equal(f[0].level, 'error');
  assert.equal(f[0].file, '.sdd/constitution.md');
  assert.match(f[0].message, /lines/);
});

test('invariant ID not matching [A-Z]+[0-9]+ is an error', () => {
  const f = found(constitution(ROW.replace('K1', 'one')));
  assert.equal(f.length, 1);
  assert.match(f[0].message, /ID/);
});

test('empty Violated when cell is an error', () => {
  const f = found(constitution('| K1 | Files first |  | `src/bookings.js` |\n'));
  assert.equal(f.length, 1);
  assert.match(f[0].message, /Violated when/);
});

test('evidence naming no existing file is an error', () => {
  const f = found(constitution(ROW.replace('src/bookings.js', 'src/missing.js')));
  assert.equal(f.length, 1);
  assert.match(f[0].message, /Evidence/);
  assert.equal(found(constitution(ROW.replace('`src/bookings.js`', ''))).length, 1);
});

test('generic-value words are an error', () => {
  for (const word of ['quality', 'simplicity', 'best practices', 'clean code', 'excellence']) {
    const f = found(constitution(ROW.replace('Files first', `High ${word}`)));
    assert.equal(f.length, 1, word);
    assert.match(f[0].message, new RegExp(word));
  }
});

test('constitution is read from the configured path', () => {
  const root = tmpRepo({
    '.sdd/config.yaml': `${CONFIG}paths: { constitution: docs/constitution.md }\n`,
    'docs/constitution.md': HEAD + ROW.replace('K1', 'one'),
    'src/bookings.js': 'export {};\n',
  });
  assert.equal(found(root).length, 1);
  assert.equal(found(root)[0].file, 'docs/constitution.md');
});

test('a MODIFIED requirement that drops existing criteria fails V-DELTA', () => {
  const living = LIVING.replace('### REQ-BOOK-1: Create a booking\nText.\n', '### REQ-BOOK-1: Create a booking\nText.\n- AC-BOOK-1.1 Given a guest, When booking, Then it is confirmed.\n');
  const delta = DELTA.replace('## MODIFIED\n', '## MODIFIED\n### REQ-BOOK-1: Create a booking\nNew text. Existing acceptance criteria are unchanged.\n');
  const f = validate(repo({ 'docs/specs/bookings.md': living, 'docs/changes/c1/delta.md': delta }), { id: 'c1' });
  assert.ok(f.some((x) => x.rule === 'V-DELTA' && x.level === 'error' && /AC-BOOK-1\.1/.test(x.message)), JSON.stringify(f));
});

test('criteria carried unchanged in a MODIFIED requirement need no task', () => {
  const ac = '- AC-BOOK-1.1 Given a guest, When booking, Then it is confirmed.';
  const living = LIVING.replace('### REQ-BOOK-1: Create a booking\nText.\n', `### REQ-BOOK-1: Create a booking\nText.\n${ac}\n`);
  const delta = DELTA.replace('## MODIFIED\n', `## MODIFIED\n### REQ-BOOK-1: Create a booking\nNew text.\n${ac}\n`);
  const f = validate(repo({ 'docs/specs/bookings.md': living, 'docs/changes/c1/delta.md': delta }), { id: 'c1' });
  assert.deepEqual(f.filter((x) => x.level === 'error'), []);
});

// ---- V-ATTRIBUTION (REQ-VAL-6) ----

test('an AI attribution line in an open pr.md fails V-ATTRIBUTION with its line (AC-11, AC-VAL-6.1)', () => {
  const root = repo({ 'docs/changes/c1/pr.md': '# PR\n\nBody.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n' });
  const hit = validate(root, { id: 'c1' }).find((x) => x.rule === 'V-ATTRIBUTION');
  assert.ok(hit, 'expected a V-ATTRIBUTION finding');
  assert.equal(hit.level, 'error');
  assert.equal(hit.file, 'docs/changes/c1/pr.md');
  assert.equal(hit.line, 5);
});

test('an AI co-author line in an open pr.md fails V-ATTRIBUTION', () => {
  const root = repo({ 'docs/changes/c1/pr.md': '# PR\n\nCo-Authored-By: Claude <noreply@anthropic.com>\n' });
  assert.ok(rules(validate(root, { id: 'c1' })).includes('V-ATTRIBUTION'));
});

test('the author sign-off and human co-authors pass V-ATTRIBUTION', () => {
  const root = repo({ 'docs/changes/c1/pr.md': '# PR\n\nSigned-off-by: Some Person\nCo-authored-by: Other Person\n' });
  assert.ok(!rules(validate(root, { id: 'c1' })).includes('V-ATTRIBUTION'));
});

test('archived changes are not checked for attribution (AC-12, AC-VAL-6.2)', () => {
  const root = repo({
    'docs/changes/archive/old/state.yaml': state('old', 'quick', ['route']),
    'docs/changes/archive/old/pr.md': '# PR\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n',
  });
  assert.ok(!validate(root, { all: true }).some((x) => x.rule === 'V-ATTRIBUTION'));
});
