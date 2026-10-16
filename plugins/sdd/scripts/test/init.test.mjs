import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpRepo, writeFiles } from './helpers.mjs';
import { initPlan, initApply, upsertAgentsSection, seedGroups } from '../lib/init.mjs';
import { validate } from '../lib/validate.mjs';

const node = () => tmpRepo({ 'package.json': JSON.stringify({ scripts: { test: 'node --test', lint: 'eslint .' } }) });

test('plan proposes config from detection and lists files without writing (AC-INIT-4.1)', () => {
  const root = node();
  const plan = initPlan(root);
  assert.match(plan.config, /test: npm test/);
  assert.ok(plan.files.includes('.sdd/config.yaml'));
  assert.ok(!fs.existsSync(path.join(root, '.sdd')));
});

test('apply writes config, rules, AGENTS section, CLAUDE import and gitignore', () => {
  const root = node();
  initApply(root, { seed: ['specs'] });
  for (const f of ['.sdd/config.yaml', '.sdd/rules.md', 'AGENTS.md', 'CLAUDE.md', '.gitignore']) assert.ok(fs.existsSync(path.join(root, f)), f);
  assert.match(fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8'), /^@AGENTS\.md$/m);
  assert.match(fs.readFileSync(path.join(root, '.gitignore'), 'utf8'), /^\.sdd\/local\/$/m);
  assert.match(fs.readFileSync(path.join(root, '.sdd/rules.md'), 'utf8'), /^## R1: /m);
  assert.deepEqual(validate(root, { all: true }).filter((f) => f.level === 'error'), []);
});

test('re-running apply keeps an existing config and only replaces the marked section (AC-INIT-4.2, AC-INIT-6.1)', () => {
  const root = node();
  writeFiles(root, {
    '.sdd/config.yaml': 'version: 1\nbase_branch: develop\n',
    'AGENTS.md': '# Team notes\n\nKeep this.\n',
    'CLAUDE.md': '# Project\n@AGENTS.md\n',
  });
  initApply(root, {});
  initApply(root, {});
  assert.equal(fs.readFileSync(path.join(root, '.sdd/config.yaml'), 'utf8'), 'version: 1\nbase_branch: develop\n');
  const agents = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
  assert.match(agents, /Keep this\./);
  assert.equal(agents.match(/sdd:begin/g).length, 1);
  assert.equal(fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8').match(/@AGENTS\.md/g).length, 1);
});

test('agents section stays within 40 lines', () => {
  const root = node();
  upsertAgentsSection(root);
  const text = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
  const section = text.slice(text.indexOf('<!-- sdd:begin -->'), text.indexOf('<!-- sdd:end -->'));
  assert.ok(section.split('\n').length <= 41);
});

test('plan records the constitution path only when it is not the default (AC-INIT-5.3)', () => {
  const root = node();
  assert.match(initPlan(root, { constitution: 'docs/constitution.md' }).config, /^paths: \{ constitution: docs\/constitution\.md \}$/m);
  assert.doesNotMatch(initPlan(root, { constitution: '.sdd/constitution.md' }).config, /paths/);
  assert.doesNotMatch(initPlan(root).config, /paths/);
});

test('apply writes the constitution only at the confirmed location (AC-INIT-5.4)', () => {
  const root = node();
  initApply(root, { constitution: 'docs/constitution.md', constitutionText: '# Constitution\n' });
  assert.equal(fs.readFileSync(path.join(root, 'docs/constitution.md'), 'utf8'), '# Constitution\n');
  assert.ok(!fs.existsSync(path.join(root, '.sdd/constitution.md')));
  assert.match(fs.readFileSync(path.join(root, '.sdd/config.yaml'), 'utf8'), /constitution: docs\/constitution\.md/);
  assert.deepEqual(validate(root, { all: true }).filter((f) => f.level === 'error'), []);
});

test('team activation writes exactly the marketplace and plugin entries (AC-INIT-7.1)', () => {
  const root = node();
  initApply(root, { team: 'owner/sdd-kit' });
  const s = JSON.parse(fs.readFileSync(path.join(root, '.claude/settings.json'), 'utf8'));
  assert.deepEqual(Object.keys(s).sort(), ['enabledPlugins', 'extraKnownMarketplaces']);
  assert.equal(s.enabledPlugins['sdd@sdd-kit'], true);
  assert.equal(s.extraKnownMarketplaces['sdd-kit'].source.repo, 'owner/sdd-kit');
});

test('seed rule groups are available and valid', () => {
  const groups = seedGroups();
  assert.ok(groups.length >= 4);
  assert.ok(groups.every((g) => g.rules.length > 0));
});

for (const [stack, fixture, testCmd] of [
  ['node', 'node-pnpm', 'pnpm test'],
  ['java', 'maven-wrapper', './mvnw test'],
  ['python', 'python-pytest-ruff', 'pytest'],
]) {
  test(`init applies cleanly in a ${stack} repository without touching the kit`, () => {
    const src = path.join(path.dirname(new URL(import.meta.url).pathname), 'fixtures', 'stacks', fixture);
    const root = tmpRepo();
    fs.cpSync(src, root, { recursive: true });
    initApply(root, { seed: ['git'] });
    const cfg = fs.readFileSync(path.join(root, '.sdd/config.yaml'), 'utf8');
    assert.ok(cfg.includes(`test: ${testCmd.includes(' ') && /[:#]/.test(testCmd) ? JSON.stringify(testCmd) : testCmd}`), cfg);
    assert.deepEqual(validate(root, { all: true }).filter((f) => f.level === 'error'), []);
  });
}

test('re-running init keeps the configured constitution location (AC-INIT-5.2)', async () => {
  const { constitutionLocation } = await import('../lib/init.mjs');
  const root = tmpRepo({ '.sdd/config.yaml': 'version: 1\npaths: { constitution: docs/constitution.md }\n' });
  assert.equal(constitutionLocation(root), 'docs/constitution.md');
  initApply(root, { constitutionText: '# Constitution\n' });
  assert.ok(fs.existsSync(path.join(root, 'docs/constitution.md')));
  assert.ok(!fs.existsSync(path.join(root, '.sdd/constitution.md')));
});
