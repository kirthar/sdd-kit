// Deterministic state.yaml writer, so diffs stay small and reviewable.
import fs from 'node:fs';

const scalar = (v) => {
  if (v instanceof Date) return v.toISOString().replace('.000Z', 'Z');
  const s = String(v);
  return /^[\w./:@+-]+$/.test(s) && !/^(true|false|null|yes|no|~)$/i.test(s) ? s : JSON.stringify(s);
};
const list = (a) => `[${(a ?? []).map(scalar).join(', ')}]`;
const entry = (e) => `{ by: ${scalar(e.by)}, at: ${scalar(e.at)} }`;

export function serializeState(s) {
  const out = [`id: ${scalar(s.id)}`, `route: ${scalar(s.route)}`, `capabilities: ${list(s.capabilities)}`];
  if (s.route_override) out.push(`route_override: { from: ${scalar(s.route_override.from)}, signals: ${list(s.route_override.signals)} }`);
  const { plans, ...phases } = s.approvals ?? {};
  const keys = Object.keys(phases);
  if (!keys.length && !Object.keys(plans ?? {}).length) out.push('approvals: {}');
  else {
    out.push('approvals:');
    for (const k of keys) out.push(`  ${k}: ${entry(phases[k])}`);
    if (plans && Object.keys(plans).length) {
      out.push('  plans:');
      for (const [t, e] of Object.entries(plans)) out.push(`    ${t}: ${entry(e)}`);
    }
  }
  out.push(`prs: ${list(s.prs)}`);
  return `${out.join('\n')}\n`;
}

export function writeState(file, s) {
  fs.writeFileSync(file, serializeState(s));
}
