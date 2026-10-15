// `sdd archive <id>`: deterministic merge of spec deltas into docs/specs (REQ-VAL-2).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadChange, changesDir } from './changes.mjs';
import { loadConfig } from './config.mjs';
import { validate, templateFor } from './validate.mjs';
import { section, splitFrontmatter, deltaParts } from './markdown.mjs';

export function archive(root, id, { mergedConfirmed = false, today = new Date().toISOString().slice(0, 10) } = {}) {
  const change = loadChange(root, id);
  if (!change) return { ok: false, message: `change ${id} not found` };
  const errors = validate(root, { id }).filter((f) => f.level === 'error');
  if (errors.length) return { ok: false, message: `fix validation first:\n${errors.map((f) => `${f.rule} ${f.file} ${f.message}`).join('\n')}` };

  const merged = prsMerged(root, change.state.prs ?? []);
  if (merged === false) return { ok: false, message: 'some pull requests are not merged yet' };
  if (merged === null && !mergedConfirmed) {
    return { ok: false, message: 'cannot check that the pull requests are merged; the person must confirm (--merged-confirmed)' };
  }

  const deltas = readDeltas(change);
  const plan = deltas ? planUpdates(root, change, deltas, today) : { ok: true, writes: [] };
  if (!plan.ok) return plan;
  for (const w of plan.writes) {
    fs.mkdirSync(path.dirname(w.file), { recursive: true });
    fs.writeFileSync(w.file, w.text);
  }
  const target = path.join(changesDir(root), 'archive', id);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.renameSync(change.dir, target);
  const after = validate(root, { specs: true }).filter((f) => f.level === 'error');
  return { ok: true, message: `Archived ${id}; updated ${plan.writes.length} living spec(s).${after.length ? ` Warning: ${after.length} spec finding(s) after archive.` : ''}` };
}

// true = all merged, false = some open, null = unknown (no forge, no PRs or gh unavailable)
function prsMerged(root, prs) {
  if (!prs.length || loadConfig(root).config.pr?.forge === 'none') return null;
  try {
    return prs.every((url) => execFileSync('gh', ['pr', 'view', url, '--json', 'state', '--jq', '.state'], { cwd: root, encoding: 'utf8', timeout: 30000 }).trim() === 'MERGED');
  } catch {
    return null;
  }
}

function readDeltas({ state, dir }) {
  if (state.route === 'standard') return deltaParts(fs.readFileSync(path.join(dir, 'delta.md'), 'utf8'));
  if (state.route === 'full') {
    const living = section(fs.readFileSync(path.join(dir, 'technical.md'), 'utf8'), 'Living spec deltas');
    return living ? deltaParts(living.text) : null;
  }
  return null;
}

// Requirement blocks: `### REQ-…` heading plus its body, trimmed.
function blocks(text) {
  const out = [];
  let cur = null;
  for (const line of text.split('\n')) {
    const m = line.match(/^###\s+(REQ-[A-Z0-9]+-\d+)\b/);
    if (m) {
      cur = { id: m[1], lines: [line] };
      out.push(cur);
    } else if (/^#{1,3}\s/.test(line)) cur = null;
    else if (cur) cur.lines.push(line);
  }
  return out.map((b) => ({ id: b.id, text: b.lines.join('\n').replace(/<!--[\s\S]*?-->/g, '').trim() }));
}

const num = (id) => Number(id.split('-').pop());
const prefix = (id) => id.replace(/-\d+$/, '');

function parseSpec(file) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');
  const reqStart = lines.findIndex((l) => /^##\s+Requirements\s*$/.test(l));
  if (reqStart < 0) return null;
  let reqEnd = lines.findIndex((l, i) => i > reqStart && /^##\s/.test(l));
  if (reqEnd < 0) reqEnd = lines.length;
  const body = lines.slice(reqStart + 1, reqEnd).join('\n');
  const firstReq = body.search(/^###\s+REQ-/m);
  const preamble = (firstReq < 0 ? body : body.slice(0, firstReq)).replace(/<!--[\s\S]*?-->/g, '').trim();
  return { file, lines, reqStart, reqEnd, preamble, reqs: blocks(body) };
}

function renderSpec(spec, history) {
  const before = spec.lines.slice(0, spec.reqStart + 1).join('\n');
  let after = spec.lines.slice(spec.reqEnd).join('\n');
  const reqs = [spec.preamble, ...spec.reqs.map((r) => r.text)].filter(Boolean).join('\n\n');
  if (history.length) {
    if (/^##\s+History\s*$/m.test(after)) after = after.replace(/^(##\s+History\s*\n)([\s\S]*)$/m, (_, h, rest) => `${h}${rest.replace(/\n*$/, '\n')}${history.join('\n')}\n`.replace(/\n\n(- )/, '\n$1'));
    else after = `${after.replace(/\n*$/, '\n')}\n## History\n${history.join('\n')}\n`;
  }
  return `${before}\n\n${reqs}\n\n${after}`.replace(/\n{3,}/g, '\n\n');
}

function planUpdates(root, change, d, today) {
  const specsDir = path.join(root, 'docs', 'specs');
  const caps = change.state.capabilities ?? [];
  const specs = new Map();
  const load = (file) => {
    if (!specs.has(file)) specs.set(file, { spec: parseSpec(file), history: [] });
    return specs.get(file);
  };
  const files = fs.existsSync(specsDir) ? fs.readdirSync(specsDir).filter((n) => n.endsWith('.md')).map((n) => path.join(specsDir, n)) : [];
  const owner = (id) => files.find((f) => load(f).spec?.reqs.some((r) => r.id === id));
  const problems = [];

  for (const b of blocks(d.modified)) {
    const f = owner(b.id);
    if (!f) problems.push(`MODIFIED ${b.id} does not exist in docs/specs`);
    else load(f).spec.reqs = load(f).spec.reqs.map((r) => (r.id === b.id ? b : r));
  }
  for (const m of d.removed.matchAll(/^\s*[-*]\s+(REQ-[A-Z0-9]+-\d+):?\s*(.*)$/gm)) {
    const f = owner(m[1]);
    if (!f) problems.push(`REMOVED ${m[1]} does not exist in docs/specs`);
    else {
      const s = load(f);
      s.spec.reqs = s.spec.reqs.filter((r) => r.id !== m[1]);
      s.history.push(`- ${today} ${change.id}: ${m[1]} removed — ${m[2].trim() || 'no reason given'}`);
    }
  }
  for (const b of blocks(d.added)) {
    if (owner(b.id)) {
      problems.push(`ADDED ${b.id} already exists in docs/specs`);
      continue;
    }
    let f = files.find((x) => load(x).spec?.reqs.some((r) => prefix(r.id) === prefix(b.id)));
    if (!f) {
      f = path.join(specsDir, `${caps[0] ?? prefix(b.id).slice(4).toLowerCase()}.md`);
      if (!fs.existsSync(f) && !specs.has(f)) {
        const body = splitFrontmatter(templateFor(root, 'living-spec').text).body.replace('<Capability>', path.basename(f, '.md'));
        specs.set(f, { spec: { ...parseSpecText(f, `---\nstatus: verified\n---\n${body}`) }, history: [] });
      }
    }
    const s = load(f);
    s.spec.reqs.push(b);
    s.spec.reqs.sort((a, c) => (prefix(a.id) === prefix(c.id) ? num(a.id) - num(c.id) : 0));
  }
  if (problems.length) return { ok: false, message: problems.join('\n') };
  const writes = [];
  for (const [file, { spec, history }] of specs) {
    if (!spec) continue;
    const text = renderSpec(spec, history);
    const original = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (text !== original && (history.length || touched(spec, original))) writes.push({ file, text });
  }
  return { ok: true, writes };
}

function touched(spec, original) {
  return original === null || renderSpec(spec, []) !== original;
}

function parseSpecText(file, text) {
  const tmp = `${file}.sdd-tmp`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(tmp, text);
  try {
    return parseSpec(tmp) && { ...parseSpec(tmp), file };
  } finally {
    fs.rmSync(tmp);
  }
}
