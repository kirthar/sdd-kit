// `sdd validate` (docs/specs/validation.md, REQ-VAL-1). Pure reads plus an optional npx linter.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import yaml from '../vendor/js-yaml.mjs';
import { loadConfig, validateConfig, isProjectRelative } from './config.mjs';
import { ROUTES, ID_PATTERN, changesDir, listChanges, loadChange, requiredApprovals } from './changes.mjs';
import {
  splitFrontmatter, countLines, headings, section, criteria, tasks, openQuestions,
  requirementIds, TASK_REQUIRED, fieldLabel, deltaParts,
} from './markdown.mjs';

export const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const REQUIREMENTS = JSON.parse(readOr(path.join(PLUGIN_ROOT, 'scripts', 'requirements.json'), '{}'));

const ARTIFACTS = {
  quick: { 'brief.md': 'brief', 'pr.md': 'pr-quick' },
  standard: { 'delta.md': 'delta', 'tasks.md': 'tasks', 'test-plan.md': 'test-plan', 'verification.md': 'verification', 'pr.md': 'pr' },
  full: {
    'functional.md': 'functional', 'technical.md': 'technical', 'tasks.md': 'tasks',
    'test-plan.md': 'test-plan', 'verification.md': 'verification', 'pr.md': 'pr',
  },
};
const QUICK_ALLOWED = new Set(['state.yaml', 'brief.md', 'pr.md']);
const CRITERIA_SOURCE = { standard: 'delta.md', full: 'functional.md' };
const APPROVAL_ARTIFACT = { functional: { full: 'functional.md' }, spec: { standard: 'delta.md', full: 'technical.md' } };
const PROSE_TEMPLATES = new Set(['brief', 'functional', 'delta', 'technical']);

function readOr(p, fallback) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return fallback;
  }
}

export function validate(root, opts = {}) {
  const f = [];
  const add = (rule, level, file, line, message) => f.push({ rule, level, file, line, message });
  const rel = (p) => path.relative(root, p).split(path.sep).join('/');
  const everything = opts.all || (!opts.id && !opts.specs && !opts.templates);

  if (everything) {
    const { raw, exists, config } = loadConfig(root);
    if (exists) for (const x of validateConfig(raw)) add(x.rule, x.level, '.sdd/config.yaml', null, x.message);
    const constitution = config.paths.constitution;
    if (exists && isProjectRelative(constitution) && !fs.existsSync(path.join(root, constitution))) {
      add('V-CONFIG', 'warn', '.sdd/config.yaml', null, `paths.constitution: ${constitution} does not exist`);
    } else if (isProjectRelative(constitution)) {
      validateConstitution(root, constitution, add);
    }
    validateRules(root, add);
    validateLeaks(root, add, rel);
  }
  if (everything || opts.specs) validateSpecs(root, add, rel);
  if (everything || opts.templates) validateTemplates(root, add, rel);
  const changes = opts.id ? [loadChange(root, opts.id)].filter(Boolean) : everything ? listChanges(root) : [];
  if (opts.id && !changes.length) add('V-STATE', 'error', `docs/changes/${opts.id}`, null, 'change not found');
  for (const c of changes) validateChange(root, c, add, rel);
  return f;
}

// ---------- changes ----------

function validateChange(root, change, add, rel) {
  const { state, dir, id } = change;
  const sf = rel(change.file);
  if (!ID_PATTERN.test(id)) add('V-STATE', 'error', sf, null, `invalid change id "${id}"`);
  if (state.id !== undefined && state.id !== id) add('V-STATE', 'error', sf, null, `id "${state.id}" does not match folder "${id}"`);
  if (!ROUTES.includes(state.route)) {
    add('V-STATE', 'error', sf, null, `route must be one of ${ROUTES.join(', ')}`);
    return;
  }
  const allowed = new Set([...requiredApprovals(state.route), 'plans']);
  for (const k of Object.keys(state.approvals ?? {})) {
    if (!allowed.has(k)) add('V-STATE', 'error', sf, null, `approval "${k}" does not exist for route ${state.route}`);
  }

  const files = fs.readdirSync(dir);
  if (state.route === 'quick') {
    for (const name of files) if (!QUICK_ALLOWED.has(name)) add('V-QUICK', 'error', rel(path.join(dir, name)), null, 'quick changes contain only state.yaml, brief.md and pr.md');
  }

  for (const [name, tpl] of Object.entries(ARTIFACTS[state.route])) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) checkArtifact(root, p, tpl, add, rel);
  }

  const taskList = fs.existsSync(path.join(dir, 'tasks.md')) ? tasks(fs.readFileSync(path.join(dir, 'tasks.md'), 'utf8')) : null;
  for (const t of Object.keys(state.approvals?.plans ?? {})) {
    if (!taskList?.some((x) => x.id === t)) add('V-STATE', 'error', sf, null, `plan approval for unknown task ${t}`);
  }

  const critFile = CRITERIA_SOURCE[state.route];
  let crit = [];
  if (critFile && fs.existsSync(path.join(dir, critFile))) {
    const p = path.join(dir, critFile);
    crit = criteria(fs.readFileSync(p, 'utf8'));
    for (const c of crit) {
      if (!/\bGiven\b/i.test(c.text) || !/\bWhen\b/i.test(c.text) || !/\bThen\b/i.test(c.text)) {
        add('V-AC-FORMAT', 'error', rel(p), c.line, `${c.id} needs Given, When and Then`);
      }
    }
  }
  if (taskList) checkTasks(taskList, crit, path.join(dir, 'tasks.md'), add, rel);

  const contracts = path.join(dir, 'contracts');
  if (fs.existsSync(contracts)) {
    for (const name of fs.readdirSync(contracts).filter((n) => /\.ya?ml$|\.json$/.test(n))) {
      checkOpenApi(path.join(contracts, name), add, rel);
    }
  }
  checkDelta(root, change, add, rel);

  for (const phase of ['functional', 'spec']) {
    const art = APPROVAL_ARTIFACT[phase][state.route];
    if (!art || !state.approvals?.[phase]) continue;
    const p = path.join(dir, art);
    if (!fs.existsSync(p)) continue;
    for (const q of openQuestions(fs.readFileSync(p, 'utf8'))) {
      if (q.blocking) add('V-OPEN-Q', 'error', rel(p), q.line, `"${phase}" is approved while a BLOCKING question is open`);
    }
  }
}

export function templateFor(root, name) {
  const override = path.join(root, '.sdd', 'templates', `${name}.md`);
  const file = fs.existsSync(override) ? override : path.join(PLUGIN_ROOT, 'templates', `${name}.md`);
  const text = readOr(file, '');
  return { file, text, ...splitFrontmatter(text).data };
}

function checkArtifact(root, p, tplName, add, rel) {
  const text = fs.readFileSync(p, 'utf8');
  const tpl = templateFor(root, tplName);
  const titles = headings(text).map((h) => h.title.toLowerCase());
  for (const req of tpl.required ?? []) {
    if (!titles.includes(String(req).toLowerCase())) {
      add('V-SECTIONS', 'error', rel(p), null, `missing section "${req}" (template ${rel(tpl.file).startsWith('..') ? tplName : rel(tpl.file)})`);
    }
  }
  if (tpl.max_lines) {
    const n = countLines(text);
    if (n > tpl.max_lines * 1.5) add('V-SIZE', 'error', rel(p), null, `${n} lines, budget ${tpl.max_lines} (fails above ${Math.floor(tpl.max_lines * 1.5)})`);
    else if (n > tpl.max_lines) add('V-SIZE', 'warn', rel(p), null, `${n} lines, budget ${tpl.max_lines}`);
  }
  for (const h of headings(text)) {
    if (/^T\d+/.test(h.title) && h.level === 2 && !/^T\d+: [\p{L}\p{N} ]+$/u.test(h.title)) {
      add('V-HEADING', 'error', rel(p), h.line, `task heading "${h.title}" must be "T<n>: <words>" without punctuation`);
    }
    if (/^REQ-/.test(h.title) && !/^REQ-[A-Z0-9]+-\d+: [\p{L}\p{N} ]+$/u.test(h.title)) {
      add('V-HEADING', 'error', rel(p), h.line, `requirement heading "${h.title}" must be "REQ-<CAP>-<n>: <words>"`);
    }
  }
  if (tplName === 'tasks' && tpl.max_tasks && tasks(text).length > tpl.max_tasks) {
    add('V-SIZE', 'warn', rel(p), null, `${tasks(text).length} tasks, budget ${tpl.max_tasks}`);
  }
}

function checkTasks(list, crit, file, add, rel) {
  const known = new Set(crit.map((c) => c.id));
  const covered = new Set();
  for (const t of list) {
    const missing = TASK_REQUIRED.filter((k) => t.fields[k] === undefined);
    if (missing.length) add('V-TASK-FIELDS', 'error', rel(file), t.line, `${t.id} is missing ${missing.map(fieldLabel).join(', ')}`);
    const cov = t.fields.covers ?? [];
    if (t.fields.covers !== undefined && !cov.length) add('V-TRACE', 'error', rel(file), t.line, `${t.id} covers no criterion`);
    for (const c of cov) {
      covered.add(c);
      if (crit.length && !known.has(c)) add('V-TRACE', 'error', rel(file), t.line, `${t.id} covers ${c}, which does not exist`);
    }
  }
  for (const c of crit) if (!covered.has(c.id)) add('V-TRACE', 'error', rel(file), null, `${c.id} is not covered by any task`);
}

function checkDelta(root, change, add, rel) {
  const { state, dir } = change;
  const file = state.route === 'standard' ? 'delta.md' : state.route === 'full' ? 'technical.md' : null;
  if (!file || !fs.existsSync(path.join(dir, file))) return;
  const p = path.join(dir, file);
  const text = fs.readFileSync(p, 'utf8');
  const existing = new Set(livingRequirementIds(root));
  const scope = state.route === 'full' ? section(text, 'Living spec deltas')?.text ?? '' : text;
  const d = deltaParts(scope);
  for (const r of requirementIds(d.added)) {
    if (existing.has(r.id)) add('V-DELTA', 'error', rel(p), null, `ADDED ${r.id} already exists in docs/specs`);
  }
  for (const r of requirementIds(d.modified)) {
    if (!existing.has(r.id)) add('V-DELTA', 'error', rel(p), null, `MODIFIED ${r.id} does not exist in docs/specs`);
  }
  for (const m of d.removed.matchAll(/^\s*[-*]\s+(REQ-[A-Z0-9]+-\d+)/gm)) {
    if (!existing.has(m[1])) add('V-DELTA', 'error', rel(p), null, `REMOVED ${m[1]} does not exist in docs/specs`);
  }
}

export function livingRequirementIds(root) {
  const dir = path.join(root, 'docs', 'specs');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((n) => n.endsWith('.md'))
    .flatMap((n) => requirementIds(fs.readFileSync(path.join(dir, n), 'utf8')).map((r) => r.id));
}

// ---------- OpenAPI ----------

function checkOpenApi(p, add, rel) {
  if (!process.env.SDD_OFFLINE) {
    const online = redoclyLint(p);
    if (online) {
      for (const msg of online.errors) add('V-OPENAPI', 'error', rel(p), null, `${msg} (mode: redocly)`);
      return;
    }
  }
  for (const msg of structuralOpenApi(fs.readFileSync(p, 'utf8'))) add('V-OPENAPI', 'error', rel(p), null, `${msg} (mode: structural)`);
}

function redoclyLint(p) {
  const version = REQUIREMENTS.redoclyCli;
  if (!version) return null;
  const r = spawnSync('npx', ['--yes', `@redocly/cli@${version}`, 'lint', '--extends=minimal', '--format=json', p], { encoding: 'utf8', timeout: 120000 });
  if (r.error || r.stdout === null) return null;
  try {
    const out = JSON.parse(r.stdout);
    return { errors: [...new Set((out.problems ?? []).filter((x) => x.severity === 'error').map((x) => x.message))] };
  } catch {
    return null;
  }
}

export function structuralOpenApi(text) {
  let doc;
  try {
    doc = yaml.load(text);
  } catch (e) {
    return [`not valid YAML: ${e.reason ?? e.message}`];
  }
  const errs = [];
  if (!doc || typeof doc !== 'object') return ['empty document'];
  if (!/^3\.\d+\.\d+$/.test(String(doc.openapi ?? ''))) errs.push('openapi must be a 3.x version');
  if (!doc.info?.title || doc.info?.version === undefined) errs.push('info.title and info.version are required');
  if (!doc.paths || typeof doc.paths !== 'object') errs.push('paths must be an object');
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== 'object') return;
    if (typeof node.$ref === 'string' && node.$ref.startsWith('#/')) {
      const target = node.$ref.slice(2).split('/').reduce((o, k) => (o == null ? o : o[k.replace(/~1/g, '/').replace(/~0/g, '~')]), doc);
      if (target === undefined) errs.push(`unresolved $ref ${node.$ref}`);
    }
    Object.values(node).forEach(visit);
  };
  visit(doc);
  return errs;
}

// ---------- specs, rules, templates, leaks ----------

function validateSpecs(root, add, rel) {
  const dir = path.join(root, 'docs', 'specs');
  if (!fs.existsSync(dir)) return;
  for (const n of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
    const p = path.join(dir, n);
    const text = fs.readFileSync(p, 'utf8');
    const { data } = splitFrontmatter(text);
    if (data.status === 'unverified') add('V-UNVERIFIED', 'warn', rel(p), null, 'living spec not yet verified by a person');
    for (const c of criteria(text)) {
      if (!/\bGiven\b/i.test(c.text) || !/\bWhen\b/i.test(c.text) || !/\bThen\b/i.test(c.text)) {
        add('V-AC-FORMAT', 'error', rel(p), c.line, `${c.id} needs Given, When and Then`);
      }
    }
  }
}

export function validateRulesText(text, file, add) {
  const ids = new Set();
  const titles = new Set();
  const lines = text.split('\n');
  const retiredAt = lines.findIndex((l) => /^##\s+Retired\b/.test(l));
  lines.forEach((l, i) => {
    const m = l.match(/^##\s+(R\d+):\s*(.+)$/);
    if (!m) return;
    if (ids.has(m[1])) add('V-RULES', 'error', file, i + 1, `duplicate rule id ${m[1]}`);
    const key = m[2].trim().toLowerCase();
    if (titles.has(key) && (retiredAt < 0 || i < retiredAt)) add('V-RULES', 'error', file, i + 1, `duplicate rule title "${m[2]}"`);
    ids.add(m[1]);
    titles.add(key);
    const block = lines.slice(i + 1, i + 6).join('\n');
    for (const label of ['Why', 'How to apply']) {
      if (!new RegExp(`^\\s*-\\s+${label}:`, 'm').test(block)) add('V-RULES', 'error', file, i + 1, `${m[1]} is missing "${label}"`);
    }
  });
}

const CONSTITUTION_MAX_LINES = 40;
const GENERIC_VALUES = ['quality', 'simplicity', 'best practices', 'clean code', 'excellence'];
const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
const isFile = (p) => fs.existsSync(p) && fs.statSync(p).isFile();

function validateConstitution(root, file, add) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  const n = countLines(text);
  if (n > CONSTITUTION_MAX_LINES) add('V-CONSTITUTION', 'error', file, null, `${n} lines, limit ${CONSTITUTION_MAX_LINES}`);
  const lines = text.split('\n');
  const at = lines.findIndex((l) => l.trim().startsWith('|') && /violated when/i.test(l));
  if (at < 0) return;
  const head = cells(lines[at]).map((c) => c.toLowerCase());
  const violated = head.indexOf('violated when');
  const evidence = head.indexOf('evidence');
  for (let i = at + 2; i < lines.length && lines[i].trim().startsWith('|'); i++) {
    const row = cells(lines[i]);
    const id = row[0] ?? '';
    const err = (message) => add('V-CONSTITUTION', 'error', file, i + 1, `${id || 'row'}: ${message}`);
    if (!/^[A-Z]+[0-9]+$/.test(id)) err('ID must match [A-Z]+[0-9]+');
    if (!row[violated]) err('"Violated when" is empty');
    const named = (evidence < 0 ? '' : row[evidence] ?? '').split(/[\s,;]+/).map((t) => t.replace(/^[`'"(]+|[`'")\].:]+$/g, '')).filter(Boolean);
    if (!named.some((t) => isFile(path.join(root, t)))) err('Evidence must name at least one existing repository file');
    for (const word of GENERIC_VALUES) {
      if (new RegExp(`\\b${word}\\b`, 'i').test(lines[i])) err(`generic value "${word}" is not an invariant`);
    }
  }
}

function validateRules(root, add) {
  const p = path.join(root, '.sdd', 'rules.md');
  if (fs.existsSync(p)) validateRulesText(fs.readFileSync(p, 'utf8'), '.sdd/rules.md', add);
}

function validateTemplates(root, add, rel) {
  const names = fs.readdirSync(path.join(PLUGIN_ROOT, 'templates')).filter((n) => n.endsWith('.md')).map((n) => n.slice(0, -3));
  for (const name of names) {
    const tpl = templateFor(root, name);
    const file = rel(tpl.file).startsWith('..') ? `templates/${name}.md` : rel(tpl.file);
    if (!tpl.template) add('V-SECTIONS', 'error', file, null, 'template frontmatter must declare "template"');
    const titles = headings(splitFrontmatter(tpl.text).body).map((h) => h.title.toLowerCase());
    for (const req of tpl.required ?? []) {
      if (!titles.some((t) => t === String(req).toLowerCase() || t.startsWith(`${String(req).toLowerCase()} `))) {
        add('V-SECTIONS', 'error', file, null, `template lacks its required heading "${req}"`);
      }
    }
    if (PROSE_TEMPLATES.has(name) && !/Writing rules:/.test(tpl.text)) add('V-SECTIONS', 'error', file, null, 'template lacks the writing-rules comment');
    if (name === 'seed-rules') validateRulesText(tpl.text, file, add);
  }
}

export const LEAK_PATTERNS = [
  ['home path', /(?:\/Users\/|\/home\/)[A-Za-z0-9._-]+\/|[A-Za-z]:\\Users\\/g],
  ['email', /\b[A-Za-z0-9._%+-]+@(?!example\.(?:com|org|net|invalid)\b)(?![A-Za-z0-9-]*\.?users\.noreply\.github\.com\b)[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/g],
  ['token', /\b(?:ghp_|gho_|ghs_|github_pat_)[A-Za-z0-9_]{20,}|\bxox[abprs]-[A-Za-z0-9-]{10,}|\bAKIA[0-9A-Z]{16}\b|\bsk-[A-Za-z0-9]{20,}|\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g],
];

function validateLeaks(root, add, rel) {
  for (const base of ['docs', '.sdd']) {
    for (const p of walk(path.join(root, base))) {
      if (!/\.(md|ya?ml|json)$/.test(p)) continue;
      fs.readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
        for (const [name, re] of LEAK_PATTERNS) {
          re.lastIndex = 0;
          if (re.test(line)) add('V-LEAK', 'error', rel(p), i + 1, `${name} found`);
        }
      });
    }
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'local' || e.name === 'node_modules' ? [] : walk(p);
    return [p];
  });
}

export { changesDir };
