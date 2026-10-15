import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { doctor, collectDoctorFacts, compareVersions, satisfies } from '../lib/doctor.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const requirements = JSON.parse(fs.readFileSync(path.join(here, '..', 'requirements.json'), 'utf8'));

const healthy = {
  nodeVersion: 'v22.3.0',
  gitVersion: 'git version 2.45.1',
  claudeVersion: '2.1.230 (Claude Code)',
  isWorkTree: true,
};
const check = (r, name) => r.checks.find((c) => c.name === name);

test('requirements.json pins node, claude and the OpenAPI linter', () => {
  assert.deepEqual(requirements, { node: '>=20.0.0', claude: '>=2.1.224', redoclyCli: '1.25.0' });
});

test('AC-INIT-1.1 Node 18 fails the node check naming the required version', () => {
  const r = doctor({ ...healthy, nodeVersion: 'v18.19.0' });
  assert.equal(r.ok, false);
  const node = check(r, 'node');
  assert.equal(node.ok, false);
  assert.equal(node.found, '18.19.0');
  assert.equal(node.required, '>=20.0.0');
  assert.match(node.hint, /Node\.js/);
  assert.match(node.hint, />=20\.0\.0/);
});

test('AC-INIT-1.2 all prerequisites → every check ok with the detected version', () => {
  const r = doctor(healthy);
  assert.equal(r.ok, true);
  assert.deepEqual(r.checks.map((c) => c.name), ['git', 'node', 'claude', 'worktree']);
  for (const c of r.checks) assert.equal(c.ok, true, c.name);
  assert.equal(check(r, 'git').found, '2.45.1');
  assert.equal(check(r, 'node').found, '22.3.0');
  assert.equal(check(r, 'claude').found, '2.1.230');
  assert.equal(check(r, 'claude').required, '>=2.1.224');
});

test('missing tools are reported with found null and a hint', () => {
  const r = doctor({ nodeVersion: 'v20.0.0', gitVersion: null, claudeVersion: null, isWorkTree: false });
  assert.equal(r.ok, false);
  assert.equal(check(r, 'node').ok, true);
  for (const name of ['git', 'claude']) {
    assert.equal(check(r, name).ok, false);
    assert.equal(check(r, name).found, null);
    assert.ok(check(r, name).hint.length > 0);
  }
  assert.equal(check(r, 'worktree').ok, false);
  assert.match(check(r, 'worktree').hint, /git/);
});

test('old Claude Code fails', () => {
  const r = doctor({ ...healthy, claudeVersion: '2.1.99 (Claude Code)' });
  assert.equal(check(r, 'claude').ok, false);
  assert.equal(r.ok, false);
});

test('unparseable version counts as missing', () => {
  const r = doctor({ ...healthy, claudeVersion: 'garbage' });
  assert.equal(check(r, 'claude').ok, false);
  assert.equal(check(r, 'claude').found, null);
});

test('semver compare is numeric, not lexical', () => {
  assert.equal(compareVersions('2.1.224', '2.1.99'), 1);
  assert.equal(compareVersions('10.0.0', '9.9.9'), 1);
  assert.equal(compareVersions('1.2', '1.2.0'), 0);
  assert.equal(compareVersions('1.2.3', '1.2.4'), -1);
  assert.equal(satisfies('20.0.0', '>=20.0.0'), true);
  assert.equal(satisfies('19.9.9', '>=20.0.0'), false);
  assert.equal(satisfies('1.25.0', '1.25.0'), true);
  assert.equal(satisfies('1.25.1', '1.25.0'), false);
  assert.equal(satisfies('2.0.0', '>1.0.0'), true);
  assert.equal(satisfies('1.0.0', '<=1.0.0'), true);
  assert.equal(satisfies('1.0.0', '<1.0.0'), false);
});

test('collectDoctorFacts gathers real facts from this environment', () => {
  const f = collectDoctorFacts(here);
  assert.equal(f.nodeVersion, process.version);
  assert.match(f.gitVersion, /\d+\.\d+/);
  assert.equal(typeof f.isWorkTree, 'boolean');
  assert.ok(f.claudeVersion === null || typeof f.claudeVersion === 'string');
});

test('collectDoctorFacts reports not a work tree outside git', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-doctor-'));
  try {
    assert.equal(collectDoctorFacts(dir).isWorkTree, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('doctor.mjs uses only Node 14 compatible syntax and APIs', () => {
  const src = fs.readFileSync(path.join(here, '..', 'lib', 'doctor.mjs'), 'utf8');
  const code = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const forbidden = [
    [/\?\?=/, '??='],
    [/\|\|=/, '||='],
    [/&&=/, '&&='],
    [/\bstructuredClone\b/, 'structuredClone'],
    [/import\.meta\.(dirname|filename)/, 'import.meta.dirname/filename'],
    [/\bObject\.hasOwn\b/, 'Object.hasOwn'],
    [/\.replaceAll\(/, 'String#replaceAll'],
    [/\.at\(/, 'Array#at'],
    [/\.findLast(Index)?\(/, 'findLast'],
    [/from\s+['"]node:/, 'node: import prefix'],
    [/assert\s*\{\s*type|with\s*\{\s*type/, 'import attributes'],
    [/#[A-Za-z_]\w*\s*[;=(]/, 'private class fields'],
  ];
  for (const [re, name] of forbidden) assert.doesNotMatch(code, re, `uses ${name}`);
  // Top-level await: any `await` on a line with no indentation.
  assert.doesNotMatch(code, /^\S[^\n]*\bawait\b/m, 'top-level await');
});
