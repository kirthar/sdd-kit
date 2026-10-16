// `sdd status`: open changes with route, derived phase, missing approvals and next command.
import { listChanges, derivePhase, missingApprovals, nextCommand, resolveActive } from './changes.mjs';

export function status(root) {
  const active = resolveActive(root);
  return {
    active,
    changes: listChanges(root).map((c) => ({
      id: c.id,
      route: c.state.route,
      phase: derivePhase(c),
      missing: missingApprovals(c.state),
      next: nextCommand(c),
      active: c.id === active,
    })),
  };
}

export function formatStatus(s) {
  if (!s.changes.length) return 'No open changes. Start one with /sdd:new "<description>".';
  return s.changes
    .map((c) => `${c.active ? '*' : ' '} ${c.id}  ${c.route}  phase: ${c.phase}  missing: ${c.missing.join(', ') || 'none'}  next: ${c.next}`)
    .join('\n');
}
