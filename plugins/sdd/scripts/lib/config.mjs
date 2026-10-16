// `.sdd/config.yaml`: defaults, loading and schema validation (V-CONFIG).
import fs from 'node:fs';
import path from 'node:path';
import yaml from '../vendor/js-yaml.mjs';

export const DEFAULTS = Object.freeze({
  version: 1,
  language: 'en',
  base_branch: 'main',
  paths: { constitution: '.sdd/constitution.md', changelog: 'CHANGELOG.md' },
  packages: [{ path: '.', commands: { test: '', test_single: '', lint: '', format: '', build: '' } }],
  testing: { tdd: 'strict', doubles: 'explicit' },
  git: { integration: 'merge' },
  commit: { format: 'conventional' },
  pr: {
    draft: true,
    auto_ready: true,
    forge: 'github',
    merge: 'squash',
    max_lines: 400,
    size_exclude: [
      'docs/**', '**/test/**', '**/tests/**', '**/__tests__/**', '**/*.test.*', '**/*.spec.*', '**/*_test.*',
      '**/package-lock.json', '**/pnpm-lock.yaml', '**/yarn.lock', '**/*.lock', '**/vendor/**',
    ],
  },
  gates: { enforce: true, exempt: [] },
  routes: { quick_max_files: 5 },
  release: { branch: 'main' },
  autopilot: {
    enabled: false,
    worktree_root: '../{repo}-worktrees',
    budgets: { tasks: 3, repairs: 1, ci_polls: 3, minutes: 60 },
    tripwires: { paths: [], keywords: [], max_files: 5 },
  },
  integrations: {},
});

const ENUMS = {
  'testing.tdd': ['strict', 'on-request'],
  'testing.doubles': ['explicit', 'any'],
  'git.integration': ['merge', 'rebase'],
  'commit.format': ['conventional', 'ticket-prefix', 'free'],
  'pr.forge': ['github', 'none'],
  'pr.merge': ['squash', 'merge', 'rebase'],
};

export function configPath(root) {
  return process.env.SDD_CONFIG || path.join(root, '.sdd', 'config.yaml');
}

export function loadConfig(root) {
  const p = configPath(root);
  if (!fs.existsSync(p)) return { exists: false, config: merge(DEFAULTS, {}), raw: null, path: p };
  const raw = yaml.load(fs.readFileSync(p, 'utf8')) ?? {};
  return { exists: true, config: merge(DEFAULTS, raw), raw, path: p };
}

function isObj(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

export function merge(base, over) {
  if (!isObj(base) || !isObj(over)) return over === undefined ? structuredClone(base) : over;
  const out = structuredClone(base);
  for (const [k, v] of Object.entries(over)) out[k] = k in base ? merge(base[k], v) : v;
  return out;
}

export function isProjectRelative(p) {
  return typeof p === 'string' && p.trim() !== '' && !path.isAbsolute(p) && !/^[a-zA-Z]:/.test(p) && !p.split(/[\\/]/).includes('..');
}

export function validateConfig(raw, file = '.sdd/config.yaml') {
  const findings = [];
  const add = (level, key, message) => findings.push({ rule: 'V-CONFIG', level, file, message: `${key}: ${message}` });
  if (!isObj(raw)) {
    add('error', '(root)', 'must be a mapping');
    return findings;
  }
  walk(DEFAULTS, raw, '');
  return findings;

  function walk(def, val, prefix) {
    for (const [k, v] of Object.entries(val)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (key === 'integrations' || key.startsWith('integrations.')) continue; // validated by integrations
      if (!(k in def)) {
        add('warn', key, 'unknown key');
        continue;
      }
      const d = def[k];
      if (ENUMS[key]) {
        if (!ENUMS[key].includes(v)) add('error', key, `must be one of ${ENUMS[key].join(', ')}`);
      } else if (Array.isArray(d)) {
        if (!Array.isArray(v)) add('error', key, 'must be a list');
      } else if (isObj(d)) {
        if (!isObj(v)) add('error', key, 'must be a mapping');
        else walk(d, v, key);
      } else if (typeof d !== typeof v) {
        add('error', key, `must be a ${typeof d}`);
      } else if (key === 'pr.max_lines' && !(Number.isInteger(v) && v >= 1)) {
        add('error', key, 'must be an integer of at least 1');
      } else if ((key === 'paths.constitution' || key === 'paths.changelog') && !isProjectRelative(v)) {
        add('error', key, 'must be a non-empty path inside the project (no absolute path, no "..")');
      }
    }
  }
}
