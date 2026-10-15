// `sdd new <slug> --route <route>`: folder, state without approvals, brief for quick, active pointer.
import fs from 'node:fs';
import path from 'node:path';
import { ROUTES, ID_PATTERN, changesDir } from './changes.mjs';
import { writeActive } from './git.mjs';
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
  fs.mkdirSync(dir, { recursive: true });
  writeState(path.join(dir, 'state.yaml'), { id, route, capabilities, approvals: {}, prs: [] });
  if (route === 'quick') fs.writeFileSync(path.join(dir, 'brief.md'), splitFrontmatter(templateFor(root, 'brief').text).body.replace(/^\n+/, ''));
  writeActive(root, id);
  const why = signals.length ? ` Signals: ${signals.join(', ')}.` : '';
  return { ok: true, id, message: `Created ${id} (${route}).${why} Ask the person to confirm with: /sdd:approve ${id} route` };
}

function stamp() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}
