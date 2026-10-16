// Deterministic parts of /sdd:init: proposal, idempotent writes, AGENTS.md section, seed rules.
import fs from 'node:fs';
import path from 'node:path';
import { detect } from './detect.mjs';
import { templateFor, PLUGIN_ROOT } from './validate.mjs';
import { splitFrontmatter } from './markdown.mjs';
import { DEFAULTS, loadConfig, isProjectRelative } from './config.mjs';

const BEGIN = '<!-- sdd:begin -->';
const END = '<!-- sdd:end -->';

const q = (s) => (s === '' || /[:#{}[\],&*?|<>=!%@`'"]/.test(s) || /^\s|\s$/.test(s) ? JSON.stringify(s) : s);

// The existing config's value wins; an invalid proposal falls back to the default.
export function constitutionLocation(root, proposed) {
  const { exists, config } = loadConfig(root);
  const own = config.paths.constitution;
  if (exists && own !== DEFAULTS.paths.constitution && isProjectRelative(own)) return own;
  return isProjectRelative(proposed) ? proposed : DEFAULTS.paths.constitution;
}

export function proposedConfig(root, constitution) {
  const d = detect(root);
  const pkgs = d.packages.length ? d.packages : [{ path: '.', commands: {} }];
  const lines = ['version: 1', `base_branch: ${q(d.base_branch ?? 'main')}`, 'packages:'];
  for (const p of pkgs) {
    lines.push(`  - path: ${q(p.path)}`, '    commands:');
    for (const k of ['test', 'test_single', 'lint', 'format', 'build']) lines.push(`      ${k}: ${q(p.commands?.[k] ?? '')}`);
  }
  lines.push(
    'testing: { tdd: strict, doubles: explicit }',
    'git: { integration: merge }',
    `commit: { format: ${d.commit_format ?? 'conventional'} }`,
    'pr: { draft: true, auto_ready: false, forge: github }',
    'gates: { enforce: true, exempt: [] }',
    'routes: { quick_max_files: 5 }',
    `release: { branch: ${q(d.base_branch ?? 'main')} }`,
    'autopilot: { enabled: false }',
  );
  const where = constitutionLocation(root, constitution);
  if (where !== DEFAULTS.paths.constitution) lines.push(`paths: { constitution: ${q(where)} }`);
  lines.push('integrations: {}');
  return { text: `${lines.join('\n')}\n`, unresolved: d.unresolved ?? [] };
}

export function initPlan(root, { constitution } = {}) {
  const { text, unresolved } = proposedConfig(root, constitution);
  const exists = (f) => fs.existsSync(path.join(root, f));
  const files = ['.sdd/config.yaml', '.sdd/rules.md', 'AGENTS.md', 'CLAUDE.md', '.gitignore'].filter((f) => f !== '.sdd/config.yaml' || !exists(f));
  return { config: text, unresolved, files, configExists: exists('.sdd/config.yaml'), agentsSection: agentsSection(root), seedGroups: seedGroups(root).map((g) => ({ name: g.name, rules: g.rules.map((r) => r.title) })) };
}

function agentsSection(root) {
  return splitFrontmatter(templateFor(root, 'agents-section').text).body.trim();
}

export function upsertAgentsSection(root) {
  const file = path.join(root, 'AGENTS.md');
  const block = `${BEGIN}\n${agentsSection(root)}\n${END}`;
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const re = new RegExp(`${BEGIN}[\\s\\S]*?${END}`);
  const next = re.test(current) ? current.replace(re, block) : `${current.replace(/\n*$/, current ? '\n\n' : '')}${block}\n`;
  fs.writeFileSync(file, next);
}

function ensureLine(file, line, header = '') {
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : header;
  if (new RegExp(`^${line.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}\\s*$`, 'm').test(current)) return;
  fs.writeFileSync(file, `${current.replace(/\n*$/, current ? '\n' : '')}${line}\n`);
}

export function seedGroups(root = process.cwd()) {
  const { body } = splitFrontmatter(templateFor(root, 'seed-rules').text);
  const groups = [];
  let cur = null;
  let rule = null;
  for (const line of body.split('\n')) {
    const g = line.match(/^#\s+(.+)$/);
    if (g) {
      cur = { name: g[1].trim().toLowerCase(), rules: [] };
      groups.push(cur);
      continue;
    }
    const r = line.match(/^##\s+R\d+:\s*(.+)$/);
    if (r && cur) {
      rule = { title: r[1].trim(), body: [] };
      cur.rules.push(rule);
    } else if (rule && line.trim()) rule.body.push(line);
  }
  return groups;
}

export function initApply(root, { seed = [], team, ci = false, constitution, constitutionText, today = new Date().toISOString().slice(0, 10) } = {}) {
  const written = [];
  const cfg = path.join(root, '.sdd', 'config.yaml');
  fs.mkdirSync(path.dirname(cfg), { recursive: true });
  if (!fs.existsSync(cfg)) {
    fs.writeFileSync(cfg, proposedConfig(root, constitution).text);
    written.push('.sdd/config.yaml');
  }
  if (constitutionText !== undefined) {
    const where = constitutionLocation(root, constitution);
    fs.mkdirSync(path.dirname(path.join(root, where)), { recursive: true });
    fs.writeFileSync(path.join(root, where), constitutionText);
    written.push(where);
  }
  const rules = path.join(root, '.sdd', 'rules.md');
  if (!fs.existsSync(rules)) {
    const chosen = seedGroups(root).filter((g) => seed.includes(g.name)).flatMap((g) => g.rules);
    const text = chosen
      .map((r, i) => `## R${i + 1}: ${r.title}\n${r.body.filter((l) => !/^- Added:/.test(l)).join('\n')}\n- Added: ${today}\n`)
      .join('\n');
    fs.writeFileSync(rules, `# Rules\n\n${text}`);
    written.push('.sdd/rules.md');
  }
  upsertAgentsSection(root);
  written.push('AGENTS.md');
  ensureLine(path.join(root, 'CLAUDE.md'), '@AGENTS.md');
  ensureLine(path.join(root, '.gitignore'), '.sdd/local/');
  written.push('CLAUDE.md', '.gitignore');
  if (ci) {
    const wf = path.join(root, '.github', 'workflows', 'sdd-validate.yml');
    if (!fs.existsSync(wf)) {
      fs.mkdirSync(path.dirname(wf), { recursive: true });
      fs.copyFileSync(path.join(PLUGIN_ROOT, 'templates', 'ci', 'sdd-validate.yml'), wf);
      written.push('.github/workflows/sdd-validate.yml');
    }
  }
  if (team) {
    const sf = path.join(root, '.claude', 'settings.json');
    const s = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    s.extraKnownMarketplaces = { ...(s.extraKnownMarketplaces ?? {}), 'sdd-kit': { source: { source: 'github', repo: team } } };
    s.enabledPlugins = { ...(s.enabledPlugins ?? {}), 'sdd@sdd-kit': true };
    fs.mkdirSync(path.dirname(sf), { recursive: true });
    fs.writeFileSync(sf, `${JSON.stringify(s, null, 2)}\n`);
    written.push('.claude/settings.json');
  }
  return { written };
}
