// Pull requests that merge without conflicts (REQ-LIFE-17, REQ-VAL-8).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpRepo } from './helpers.mjs';

const SDD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'sdd.mjs');
const ENV = { ...process.env, GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@example.invalid', GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@example.invalid' };
const run = (cwd, ...args) => spawnSync('node', [SDD, ...args], { cwd, encoding: 'utf8', env: ENV });
const lines = (n, tag) => Array.from({ length: n }, (_, i) => `${tag} ${i}`).join('\n') + '\n';

function repo() {
  const root = tmpRepo({ '.sdd/config.yaml': 'version: 1\n', 'a.txt': lines(10, 'base'), 'b.txt': 'b\n' });
  const git = (...a) => {
    const r = spawnSync('git', ['-C', root, ...a], { encoding: 'utf8', env: ENV });
    assert.equal(r.status, 0, `git ${a.join(' ')}: ${r.stderr}`);
    return r.stdout.trim();
  };
  const write = (rel, text) => fs.writeFileSync(path.join(root, rel), text);
  const commit = (msg) => {
    git('add', '-A');
    git('commit', '-qm', msg);
    return git('rev-parse', 'HEAD');
  };
  commit('base');
  return { root, git, write, commit };
}

// main ← squash(s1); s2 branched from s1, both editing the same lines of a.txt.
function stack() {
  const r = repo();
  r.git('checkout', '-qb', 's1');
  r.write('a.txt', lines(10, 's1'));
  r.commit('s1: one');
  r.write('a.txt', lines(10, 's1b'));
  const s1 = r.commit('s1: two');
  r.git('checkout', '-qb', 's2');
  r.write('a.txt', lines(10, 's2'));
  r.write('c.txt', 'c\n');
  const s2 = r.commit('s2: own work');
  r.git('checkout', '-q', 'main');
  r.git('merge', '--squash', '-q', 's1');
  const squash = r.commit('feat: slice 1 (#1)');
  r.git('checkout', '-q', 's2');
  return { ...r, s1, s2, squash };
}

const tree = (r, ref) => r.git('rev-parse', `${ref}^{tree}`);

test('restack after a squash merge has no conflicts and keeps the slice tree (AC-1)', () => {
  const r = stack();
  // A plain merge of main is what conflicted before.
  assert.notEqual(spawnSync('git', ['-C', r.root, 'merge-tree', '--write-tree', 'HEAD', 'main']).status, 0);
  const before = tree(r, 'HEAD');
  const out = run(r.root, 'restack', '--squash', r.squash, '--slice-head', r.s1, '--base', 'main');
  assert.equal(out.status, 0, out.stdout + out.stderr);
  assert.equal(tree(r, 'HEAD'), before);
  assert.equal(spawnSync('git', ['-C', r.root, 'merge-base', '--is-ancestor', 'main', 'HEAD']).status, 0);
  assert.equal(r.git('status', '--porcelain'), '');
});

test('restack brings in later unrelated work from the base (AC-2)', () => {
  const r = stack();
  r.git('checkout', '-q', 'main');
  r.write('b.txt', 'b changed\n');
  r.commit('fix: unrelated');
  r.git('checkout', '-q', 's2');
  const out = run(r.root, 'restack', '--squash', r.squash, '--slice-head', r.s1, '--base', 'main');
  assert.equal(out.status, 0, out.stdout + out.stderr);
  assert.equal(fs.readFileSync(path.join(r.root, 'b.txt'), 'utf8'), 'b changed\n');
  assert.equal(fs.readFileSync(path.join(r.root, 'a.txt'), 'utf8'), lines(10, 's2'));
});

test('restack refuses when the slice head is not in the branch (AC-3)', () => {
  const r = stack();
  const head = r.git('rev-parse', 'HEAD');
  const out = run(r.root, 'restack', '--squash', r.squash, '--slice-head', r.squash, '--base', 'main');
  assert.equal(out.status, 1);
  assert.match(out.stdout, /not an ancestor/);
  assert.equal(r.git('rev-parse', 'HEAD'), head);
});

test('restack refuses on a dirty tree (AC-4)', () => {
  const r = stack();
  const head = r.git('rev-parse', 'HEAD');
  r.write('c.txt', 'dirty\n');
  const out = run(r.root, 'restack', '--squash', r.squash, '--slice-head', r.s1, '--base', 'main');
  assert.equal(out.status, 1);
  assert.match(out.stdout, /clean/);
  assert.equal(r.git('rev-parse', 'HEAD'), head);
});

test('restack stops on a genuine conflict with later base work (AC-5)', () => {
  const r = stack();
  r.git('checkout', '-q', 'main');
  r.write('a.txt', lines(10, 'other'));
  r.commit('fix: clashing');
  r.git('checkout', '-q', 's2');
  const out = run(r.root, 'restack', '--squash', r.squash, '--slice-head', r.s1, '--base', 'main');
  assert.equal(out.status, 1);
  assert.match(out.stdout, /a\.txt/);
  assert.ok(fs.existsSync(path.join(r.root, '.git', 'MERGE_HEAD')), 'merge left in progress');
});
