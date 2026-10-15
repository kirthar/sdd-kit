// `sdd new <slug> --route <route>`: folder, state without approvals, brief for quick, active pointer.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROUTES, ID_PATTERN, changesDir } from './changes.mjs';
import { writeActive } from './git.mjs';
import { loadConfig } from './config.mjs';
import { writeState } from './state.mjs';
import { templateFor } from './validate.mjs';
import { splitFrontmatter } from './markdown.mjs';
import { UsageError } from './approve.mjs';

export function newChange(root, { slug, route, capabilities = [], signals = [], today = stamp() }) {
  if (!ROUTES.includes(route)) throw new UsageError(`route must be one of ${ROUTES.join(', ')}`);
  const clean = String(slug ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
  const id = `${today}-${clean}`;
  if (!clean || !ID_PATTERN.test(id)) throw new UsageError(`invalid slug: ${JSON.stringify(slug)}`);
  const dir = path.join(changesDir(root), id);
  if (fs.existsSync(dir)) return { ok: false, id, message: `change ${id} already exists` };
  const branch = switchToChangeBranch(root, id, loadConfig(root).config.base_branch);
  if (!branch.ok) return { ok: false, id, message: branch.message };
  fs.mkdirSync(dir, { recursive: true });
  writeState(path.join(dir, 'state.yaml'), { id, route, capabilities, approvals: {}, prs: [] });
  if (route === 'quick') fs.writeFileSync(path.join(dir, 'brief.md'), splitFrontmatter(templateFor(root, 'brief').text).body.replace(/^\n+/, ''));
  writeActive(root, id);
  const why = signals.length ? ` Signals: ${signals.join(', ')}.` : '';
  return { ok: true, id, message: `Created ${id} (${route}).${why} Ask the person to confirm with: /sdd:approve ${id} route` };
}

const git = (root, ...args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' });

// On the base branch a change gets its own `sdd/<id>` branch; anywhere else we stay put.
// A fresh repo without commits cannot switch, so it stays on its current branch.
function switchToChangeBranch(root, id, base) {
  const current = git(root, 'symbolic-ref', '--short', '-q', 'HEAD');
  if (current.status !== 0 || current.stdout.trim() !== base) return { ok: true };
  if (git(root, 'rev-parse', '--verify', '-q', 'HEAD').status !== 0) return { ok: true };
  const name = `sdd/${id}`;
  if (git(root, 'rev-parse', '--verify', '-q', `refs/heads/${name}`).status === 0) {
    return { ok: false, message: `branch ${name} already exists; nothing was created` };
  }
  if (git(root, 'status', '--porcelain', '--untracked-files=no').stdout.trim()) {
    return { ok: false, message: `cannot switch to ${name}: the working tree has uncommitted changes (dirty tree); commit or stash them first. Nothing was created` };
  }
  const sw = git(root, 'switch', '-c', name);
  if (sw.status !== 0) return { ok: false, message: `cannot switch to ${name}: ${sw.stderr.trim()}. Nothing was created` };
  return { ok: true };
}

function stamp() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}
