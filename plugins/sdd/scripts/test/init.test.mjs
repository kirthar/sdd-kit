import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
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

const git = (root, ...args) => execFileSync('git', ['-C', root, '-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { encoding: 'utf8' });
const initSkill = () => fs.readFileSync(path.resolve(import.meta.dirname, '..', '..', 'skills', 'init', 'SKILL.md'), 'utf8');

test('init skill offers a commit of exactly the written paths and the sequence leaves a clean tree (AC-7, AC-19)', () => {
  const skill = initSkill();
  assert.match(skill, /git add -- <paths>/);
  assert.match(skill, /git commit -m "chore: adopt sdd" -- <paths>/);

  const root = node();
  writeFiles(root, { 'seed.txt': 'x\n', 'staged.txt': 'already staged\n' });
  git(root, 'add', '--', 'seed.txt', 'package.json');
  git(root, 'commit', '-q', '-m', 'seed');
  git(root, 'add', '--', 'staged.txt');
  const { written } = initApply(root, {});
  git(root, 'add', '--', ...written);
  git(root, 'commit', '-q', '-m', 'chore: adopt sdd', '--', ...written);
  assert.equal(git(root, 'log', '--format=%s').trim().split('\n')[0], 'chore: adopt sdd');
  assert.deepEqual(git(root, 'show', '--name-only', '--format=', 'HEAD').trim().split('\n').sort(), [...written].sort());
  assert.equal(git(root, 'status', '--porcelain').trim(), 'A  staged.txt');
});

test('init skill says declining the offer leaves files uncommitted with no commit (AC-8)', () => {
  assert.match(initSkill(), /declin\w+[^\n]*uncommitted[^\n]*no commit/i);
  const root = node();
  git(root, 'commit', '-q', '--allow-empty', '-m', 'seed');
  const { written } = initApply(root, {});
  assert.equal(git(root, 'rev-list', '--count', 'HEAD').trim(), '1');
  assert.ok(written.every((f) => git(root, 'status', '--porcelain', '--', f).startsWith('??')));
});
