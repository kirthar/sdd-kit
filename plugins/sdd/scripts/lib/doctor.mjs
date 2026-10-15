// Prerequisite checks for `sdd doctor`.
// Written for Node 14+ on purpose: it must be able to run on an old Node and
// report it, so keep to syntax and APIs that Node 14 understands.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const REQUIREMENTS_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'requirements.json');

export function loadRequirements() {
  return JSON.parse(fs.readFileSync(REQUIREMENTS_FILE, 'utf8'));
}

// Extracts the first `x.y[.z]` from tool output such as `v20.1.0`,
// `git version 2.39.3 (Apple Git-146)` or `2.1.230 (Claude Code)`.
export function parseVersion(text) {
  if (typeof text !== 'string') return null;
  const m = text.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!m) return null;
  return [m[1], m[2], m[3] || '0'].join('.');
}

export function compareVersions(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

// Supports a single comparator: `>=`, `>`, `<=`, `<`, `=` or a bare exact version.
export function satisfies(version, range) {
  const m = String(range).trim().match(/^(>=|<=|>|<|=)?\s*v?(\d+(?:\.\d+)*)$/);
  if (!m) return false;
  const cmp = compareVersions(version, m[2]);
  switch (m[1] || '=') {
    case '>=': return cmp >= 0;
    case '>': return cmp > 0;
    case '<=': return cmp <= 0;
    case '<': return cmp < 0;
    default: return cmp === 0;
  }
}

function versionCheck(name, label, raw, required, installHint) {
  const found = parseVersion(raw);
  if (found === null) {
    return { name, ok: false, found: null, required, hint: label + ' not found; ' + installHint };
  }
  if (required !== null && !satisfies(found, required)) {
    return { name, ok: false, found, required, hint: label + ' ' + found + ' is too old; ' + required + ' is required.' };
  }
  return { name, ok: true, found, required, hint: '' };
}

export function doctor(facts, requirements) {
  const req = requirements || loadRequirements();
  const f = facts || {};
  const checks = [
    versionCheck('git', 'git', f.gitVersion, null, 'install git and make sure it is on PATH.'),
    versionCheck('node', 'Node.js', f.nodeVersion, req.node,
      'install Node.js ' + req.node + '.'),
    versionCheck('claude', 'Claude Code', f.claudeVersion, req.claude,
      'install Claude Code ' + req.claude + ' (`claude --version` must work).'),
    {
      name: 'worktree',
      ok: f.isWorkTree === true,
      found: f.isWorkTree === true ? 'yes' : 'no',
      required: 'git work tree',
      hint: f.isWorkTree === true ? '' : 'run inside a git work tree (`git init` or clone the repository).',
    },
  ];
  return { ok: checks.every(function (c) { return c.ok; }), checks };
}

function run(cmd, args, cwd) {
  try {
    return execFileSync(cmd, args, {
      cwd: cwd,
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch (e) {
    return null;
  }
}

export function collectDoctorFacts(cwd) {
  const dir = cwd || process.cwd();
  return {
    nodeVersion: process.version,
    gitVersion: run('git', ['--version'], dir),
    claudeVersion: run('claude', ['--version'], dir),
    isWorkTree: run('git', ['rev-parse', '--is-inside-work-tree'], dir) === 'true',
  };
}
