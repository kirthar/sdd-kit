// Change folders, state and the derived phase. The phase is never stored.
import fs from 'node:fs';
import path from 'node:path';
import yaml from '../vendor/js-yaml.mjs';

export const ROUTES = ['quick', 'standard', 'full'];
export const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,59}$/;

const REQUIRED = {
  quick: ['route'],
  standard: ['route', 'spec', 'tasks'],
  full: ['route', 'functional', 'spec', 'tasks'],
};

// The artifact whose existence means a phase's work has been written.
const ARTIFACT = { functional: 'functional.md', spec: { standard: 'delta.md', full: 'technical.md' }, tasks: 'tasks.md' };
const PRODUCER = { functional: '/sdd:refine', spec: '/sdd:spec', tasks: '/sdd:tasks' };

export function requiredApprovals(route) {
  return [...(REQUIRED[route] ?? [])];
}

export function changesDir(root) {
  return path.join(root, 'docs', 'changes');
}

export function listChanges(root) {
  const dir = changesDir(root);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== 'archive' && fs.existsSync(path.join(dir, e.name, 'state.yaml')))
    .map((e) => loadChange(root, e.name));
}

export function loadChange(root, id) {
  const dir = path.join(changesDir(root), id);
  const file = path.join(dir, 'state.yaml');
  if (!fs.existsSync(file)) return null;
  const state = yaml.load(fs.readFileSync(file, 'utf8')) ?? {};
  if (!state.approvals || typeof state.approvals !== 'object') state.approvals = {};
  return { id, dir, file, state };
}

export function missingApprovals(state) {
  return requiredApprovals(state.route).filter((p) => !state.approvals?.[p]);
}

function artifactFor(phase, route) {
  const a = ARTIFACT[phase];
  return typeof a === 'string' ? a : a?.[route];
}

// Returns one of: route-approval | functional | functional-approval | spec | spec-approval |
// tasks | tasks-approval | implement
export function derivePhase(change) {
  const { state, dir } = change;
  for (const p of missingApprovals(state)) {
    if (p === 'route') return 'route-approval';
    const artifact = artifactFor(p, state.route);
    return artifact && fs.existsSync(path.join(dir, artifact)) ? `${p}-approval` : p;
  }
  return 'implement';
}

export function nextCommand(change) {
  const phase = derivePhase(change);
  if (phase === 'implement') return '/sdd:implement';
  if (phase.endsWith('-approval')) return `/sdd:approve ${change.id} ${phase.replace(/-approval$/, '')}`;
  return PRODUCER[phase];
}

export function codeWritesAllowed(change) {
  return missingApprovals(change.state).length === 0;
}
