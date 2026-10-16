// Semantic squash merges and pull request size (REQ-CFG-6, REQ-INIT-8, REQ-VAL-7).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpRepo } from './helpers.mjs';

const SDD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'sdd.mjs');
const run = (cwd, ...args) => spawnSync('node', [SDD, ...args], { cwd, encoding: 'utf8' });
const json = (r) => JSON.parse(r.stdout);

// ---- config (REQ-CFG-6) ----

test('pr.merge, pr.max_lines and pr.size_exclude have defaults (AC-1)', () => {
  const r = run(tmpRepo({ '.sdd/config.yaml': 'version: 1\n' }), 'config', '--effective', '--json');
  assert.equal(r.status, 0, r.stderr);
  const pr = json(r).pr ?? json(r).config.pr;
  assert.equal(pr.merge, 'squash');
  assert.equal(pr.max_lines, 400);
  assert.ok(pr.size_exclude.includes('docs/**'));
});

for (const [name, cfg, key] of [
  ['unknown merge method', 'version: 1\npr: { merge: fast }\n', 'pr.merge'],
  ['zero budget', 'version: 1\npr: { max_lines: 0 }\n', 'pr.max_lines'],
  ['fractional budget', 'version: 1\npr: { max_lines: 2.5 }\n', 'pr.max_lines'],
  ['exclude not a list', 'version: 1\npr: { size_exclude: docs }\n', 'pr.size_exclude'],
]) {
  test(`V-CONFIG rejects ${name} (AC-2)`, () => {
    const r = run(tmpRepo({ '.sdd/config.yaml': cfg }), 'validate', '--all');
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, new RegExp(`V-CONFIG[^\\n]*${key.replace('.', '\\.')}`));
  });
}

test('init writes the merge method', async () => {
  const { initApply } = await import('../lib/init.mjs');
  const fs = await import('node:fs');
  const root = tmpRepo({ 'package.json': JSON.stringify({ scripts: { test: 'node --test' } }) });
  initApply(root, {});
  assert.match(fs.readFileSync(path.join(root, '.sdd/config.yaml'), 'utf8'), /^pr: \{[^}]*merge: squash/m);
});

// ---- forge settings (REQ-INIT-8) ----

test('forge-settings for squash: semantic squash commit, branch deleted on merge (AC-6)', () => {
  const r = run(tmpRepo({ '.sdd/config.yaml': 'version: 1\n' }), 'forge-settings', '--json');
  assert.equal(r.status, 0, r.stderr);
  const out = json(r);
  assert.deepEqual(out.settings, {
    allow_squash_merge: true,
    allow_merge_commit: false,
    allow_rebase_merge: false,
    squash_merge_commit_title: 'PR_TITLE',
    squash_merge_commit_message: 'PR_BODY',
    delete_branch_on_merge: true,
  });
  assert.equal(out.commands.length, 1);
  assert.match(out.commands[0], /^gh api -X PATCH repos\/\{owner\}\/\{repo\} /);
  assert.match(out.commands[0], /-F allow_squash_merge=true/);
  assert.match(out.commands[0], /-f squash_merge_commit_title=PR_TITLE/);
});

test('forge-settings for merge commits uses the PR title and body (AC-7)', () => {
  const out = json(run(tmpRepo({ '.sdd/config.yaml': 'version: 1\npr: { merge: merge }\n' }), 'forge-settings', '--json'));
  assert.equal(out.settings.allow_merge_commit, true);
  assert.equal(out.settings.allow_squash_merge, false);
  assert.equal(out.settings.merge_commit_title, 'PR_TITLE');
  assert.equal(out.settings.merge_commit_message, 'PR_BODY');
});

test('forge-settings without a forge prints nothing to apply (AC-8)', () => {
  const r = run(tmpRepo({ '.sdd/config.yaml': 'version: 1\npr: { forge: none }\n' }), 'forge-settings');
  assert.equal(r.status, 0);
  assert.doesNotMatch(r.stdout, /gh api/);
  assert.deepEqual(json(run(tmpRepo({ '.sdd/config.yaml': 'version: 1\npr: { forge: none }\n' }), 'forge-settings', '--json')).commands, []);
});

test('forge-settings text output shows the command to run', () => {
  const r = run(tmpRepo({ '.sdd/config.yaml': 'version: 1\n' }), 'forge-settings');
  assert.match(r.stdout, /gh api -X PATCH repos\/\{owner\}\/\{repo\}/);
});

test('init offers the forge merge settings in its single confirmation', async () => {
  const fs = await import('node:fs');
  const text = fs.readFileSync(path.resolve(path.dirname(SDD), '..', 'skills', 'init', 'SKILL.md'), 'utf8');
  assert.match(text, /sdd\.mjs" forge-settings/);
  assert.match(text, /! <command>/);
});
