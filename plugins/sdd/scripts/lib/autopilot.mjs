// Deterministic helpers for /sdd:autopilot (docs/specs/autopilot.md).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadConfig } from './config.mjs';
import { listChanges } from './changes.mjs';
import { tasks, openQuestions } from './markdown.mjs';
import { matchesAny } from './glob.mjs';
import { passLockDir, autopilotActive, HEARTBEAT_TTL_MS } from './locks.mjs';

export function acquireLock(root) {
  const dir = passLockDir(root);
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  try {
    fs.mkdirSync(dir);
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
    if (autopilotActive(root)) return { ok: false, reason: 'locked' };
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir);
  }
  heartbeat(root);
  return { ok: true };
}

export function heartbeat(root) {
  const hb = path.join(passLockDir(root), 'heartbeat');
  fs.writeFileSync(hb, `${process.pid} ${new Date().toISOString()}\n`);
}

export function releaseLock(root) {
  fs.rmSync(passLockDir(root), { recursive: true, force: true });
}

export function eligible(root) {
  const out = { eligible: [], excluded: [] };
  for (const c of listChanges(root).sort((a, b) => a.id.localeCompare(b.id))) {
    if (!c.state.approvals?.tasks) continue;
    const file = path.join(c.dir, 'tasks.md');
    if (!fs.existsSync(file)) continue;
    const blocking = fs
      .readdirSync(c.dir)
      .filter((n) => n.endsWith('.md'))
      .some((n) => openQuestions(fs.readFileSync(path.join(c.dir, n), 'utf8')).some((q) => q.blocking));
    const list = tasks(fs.readFileSync(file, 'utf8'));
    const done = new Set(list.filter((t) => /^done$/i.test(t.fields.status ?? '')).map((t) => t.id));
    for (const t of list) {
      if (done.has(t.id)) continue;
      const item = { change: c.id, task: t.id, title: t.title, fields: t.fields };
      const pending = (t.fields.depends_on ?? []).filter((d) => !done.has(d));
      if (blocking) out.excluded.push({ ...item, reason: 'blocking-question' });
      else if (pending.length) out.excluded.push({ ...item, reason: `depends-on ${pending.join(', ')}` });
      else out.eligible.push(item);
    }
  }
  return out;
}

const ALWAYS = [['contract', /(^|\/)contracts?\//], ['schema', /(^|\/)(migrations?|schema)s?(\/|$)/i]];

// Monotone OR: any hit routes to lane B; unevaluable counts as a hit (REQ-AUTO-4).
export function tripwires(config, task) {
  const tw = config.autopilot?.tripwires ?? {};
  const paths = task.fields.expected_paths ?? [];
  const fired = [];
  if (!paths.length) fired.push('unevaluable');
  for (const [name, re] of ALWAYS) if (paths.some((p) => re.test(p))) fired.push(name);
  for (const g of tw.paths ?? []) {
    if (paths.some((p) => matchesAny(p, [g]) || p.startsWith(g.replace(/\*.*$/, '')))) fired.push(`path:${g}`);
  }
  const text = `${task.title ?? ''} ${task.fields.outermost_test ?? ''}`.toLowerCase();
  for (const k of tw.keywords ?? []) if (new RegExp(`\\b${String(k).toLowerCase()}\\b`).test(text)) fired.push(`keyword:${k}`);
  if (paths.length > (tw.max_files ?? 5)) fired.push('max-files');
  if (/[,\s]/.test(String(task.fields.package ?? '').trim())) fired.push('multi-package');
  return [...new Set(fired)];
}

const NEEDED = ['Bash(git add:*)', 'Bash(git commit:*)', 'Bash(gh pr create:*)'];

function allowedPermissions(root) {
  const out = new Set();
  for (const f of ['.claude/settings.json', '.claude/settings.local.json']) {
    try {
      for (const p of JSON.parse(fs.readFileSync(path.join(root, f), 'utf8')).permissions?.allow ?? []) out.add(p);
    } catch {
      /* absent */
    }
  }
  return out;
}

export function defaultProbe(root) {
  let ghAuth = false;
  try {
    execFileSync('gh', ['auth', 'status'], { cwd: root, stdio: 'ignore', timeout: 15000 });
    ghAuth = true;
  } catch {
    ghAuth = false;
  }
  let freeBytes = Infinity;
  try {
    const s = fs.statfsSync(root);
    freeBytes = s.bavail * s.bsize;
  } catch {
    /* unknown */
  }
  return { ghAuth, freeBytes };
}

export function preflight(root, { probe = defaultProbe } = {}) {
  const { config } = loadConfig(root);
  if (!config.autopilot?.enabled) {
    return { mode: 'disabled', reasons: [], message: 'Autopilot is off. Set `autopilot.enabled: true` in .sdd/config.yaml to opt in.' };
  }
  const reasons = [];
  if (fs.existsSync(path.join(root, '.sdd', 'local', 'pause'))) reasons.push('kill switch .sdd/local/pause is present');
  const facts = probe(root);
  if (config.pr?.forge === 'github' && !facts.ghAuth) reasons.push('gh is not authenticated');
  if (facts.freeBytes !== undefined && facts.freeBytes < 1e9) reasons.push('less than 1 GB of free disk');
  const allowed = allowedPermissions(root);
  const missing = NEEDED.filter((p) => !allowed.has(p));
  if (missing.length) reasons.push(`missing permission entries: ${missing.join(', ')}`);
  return { mode: reasons.length ? 'report-only' : 'live', reasons, missing, message: reasons.join('; ') || 'ready' };
}

export function writeReport(root, { outcomes = [], plans = [], blocked = [], deferred = [], budget = {}, aborted = null } = {}) {
  const dir = path.join(root, '.sdd', 'local', 'autopilot');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}.md`);
  const list = (items) => (items.length ? items.map((x) => `- ${typeof x === 'string' ? x : Object.values(x).join(' — ')}`).join('\n') : '- none');
  fs.writeFileSync(
    file,
    [
      '# Autopilot pass',
      aborted ? `\nAborted: ${aborted}` : '',
      '\n## Outcomes', list(outcomes),
      '\n## Plans awaiting approval', list(plans),
      '\n## Blocked', list(blocked),
      '\n## Deferred by budget', list(deferred),
      '\n## Budget used', list(Object.entries(budget).map(([k, v]) => `${k}: ${v}`)),
      '',
    ].join('\n'),
  );
  return file;
}
