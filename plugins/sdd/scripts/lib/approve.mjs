// `sdd approve <id> <phase> [route=<route>]` — run only through the user-only skill (REQ-LIFE-5).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ID_PATTERN, ROUTES, loadChange, requiredApprovals, nextCommand } from './changes.mjs';
import { validate } from './validate.mjs';
import { writeState } from './state.mjs';

const PHASE = /^(route|functional|spec|tasks|plan|plan:T\d+)$/;
// `plan` records, in one act, every planning phase the route has not approved yet.
const PLANNING = ['functional', 'spec', 'tasks'];
const PHASE_FILES = {
  functional: ['functional.md'],
  spec: ['delta.md', 'technical.md', 'contracts/'],
  tasks: ['tasks.md'],
};

export class UsageError extends Error {}

function artifactFor(phase, route) {
  if (phase.startsWith('plan:')) return `plans/${phase.slice(5)}.md`;
  return { functional: 'functional.md', spec: route === 'full' ? 'technical.md' : 'delta.md', tasks: 'tasks.md' }[phase] ?? null;
}

export function approve(root, args, { by = gitUser(root), now = new Date().toISOString() } = {}) {
  const [id, phase, ...rest] = args;
  if (!id || !ID_PATTERN.test(id)) throw new UsageError(`invalid change id: ${JSON.stringify(id ?? '')}`);
  if (!phase || !PHASE.test(phase)) throw new UsageError(`invalid phase: ${JSON.stringify(phase ?? '')} (route, functional, spec, tasks, plan or plan:T<n>)`);
  const override = rest.find((r) => r.startsWith('route='))?.slice(6);
  if (override !== undefined && (phase !== 'route' || !ROUTES.includes(override))) throw new UsageError('route=<quick|standard|full> is only valid with the route phase');

  const change = loadChange(root, id);
  if (!change) return { ok: false, message: `change ${id} not found` };
  const s = change.state;
  if (override && override !== s.route) {
    s.route_override = { from: s.route, signals: s.route_override?.signals ?? [] };
    s.route = override;
  }
  const order = requiredApprovals(s.route);
  const planning = order.filter((p) => PLANNING.includes(p));
  if (phase === 'plan' && !planning.length) return { ok: false, message: `route ${s.route} has no "plan" approval` };
  if (!phase.startsWith('plan') && !order.includes(phase)) {
    return { ok: false, message: `route ${s.route} has no "${phase}" approval` };
  }

  const phases = phase === 'plan' ? planning.filter((p) => !s.approvals?.[p]) : [phase];
  if (!phases.length) return { ok: false, message: `nothing to approve: ${planning.join(', ')} already approved for ${id}` };
  if (!phase.startsWith('plan:')) {
    const earlier = order.slice(0, order.indexOf(phases[0])).filter((p) => !s.approvals?.[p]);
    if (earlier.length) return { ok: false, message: `approve ${earlier.join(', ')} first: phases are approved in order` };
  }
  for (const p of phases) {
    const artifact = artifactFor(p, s.route);
    if (artifact && !fs.existsSync(path.join(change.dir, artifact))) {
      return { ok: false, message: `nothing to approve yet: ${artifact} does not exist in docs/changes/${id}/` };
    }
  }
  const prefixes = phase.startsWith('plan:') ? [`plans/${phase.slice(5)}.md`] : phases.flatMap((p) => PHASE_FILES[p] ?? []);
  const errors = validate(root, { id }).filter(
    (f) => f.level === 'error' && (f.rule === 'V-OPEN-Q' || prefixes.some((p) => f.file?.startsWith(`docs/changes/${id}/${p}`))),
  );
  // Approving also must not hide an open BLOCKING question in the artifact itself.
  if (errors.length) {
    return { ok: false, message: `approval refused:\n${errors.map((f) => `${f.rule} ${f.file}${f.line ? `:${f.line}` : ''} ${f.message}`).join('\n')}` };
  }

  const record = { by, at: now };
  if (phase.startsWith('plan:')) s.approvals.plans = { ...(s.approvals.plans ?? {}), [phase.slice(5)]: record };
  else for (const p of phases) s.approvals[p] = record;
  writeState(change.file, s);
  const next = nextCommand(loadChange(root, id));
  return { ok: true, message: `Approved ${phases.join(', ')} for ${id} as ${by}. Next: ${next}` };
}

function gitUser(root) {
  try {
    return execFileSync('git', ['-C', root, 'config', 'user.name'], { encoding: 'utf8' }).trim() || process.env.USER || 'unknown';
  } catch {
    return process.env.USER || 'unknown';
  }
}
