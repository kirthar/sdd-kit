// `sdd context`: what every skill sees first (REQ-RULE-3).
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from './config.mjs';
import { loadChange, resolveActive, derivePhase, missingApprovals, nextCommand } from './changes.mjs';
import { splitFrontmatter } from './markdown.mjs';

const MAX_RULE_LINES = 80;

export function context(root) {
  if (!root || !loadConfig(root).exists) return 'sdd is not initialised in this repository. Ask the person to run /sdd:init.';
  const out = [];
  const id = resolveActive(root);
  const change = id && loadChange(root, id);
  if (change) {
    const missing = missingApprovals(change.state);
    out.push(`Active change: ${id} (${change.state.route}) · phase: ${derivePhase(change)} · missing approvals: ${missing.join(', ') || 'none'}`);
    out.push(`Next: ${nextCommand(change)}`);
  } else out.push('Active change: none. Code edits are gated until the person starts and confirms one.');

  const constitution = read(path.join(root, '.sdd', 'constitution.md'));
  if (constitution) out.push('', '## Constitution', splitFrontmatter(constitution).body.trim());

  const rules = parseRules(read(path.join(root, '.sdd', 'rules.md')) ?? '');
  if (rules.length) {
    out.push('', '## Rules');
    const titlesOnly = change?.state.route === 'quick';
    let used = 0;
    for (const r of rules) {
      const block = [`${r.id}: ${r.title}`, ...r.body.map((l) => `  ${l}`)];
      if (titlesOnly || used + block.length > MAX_RULE_LINES) out.push(`${r.id}: ${r.title}`);
      else {
        out.push(...block);
        used += block.length;
      }
    }
  }
  return out.join('\n');
}

function read(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

export function parseRules(text) {
  const rules = [];
  let cur = null;
  for (const line of text.split('\n')) {
    if (/^##\s+Retired\b/.test(line)) break;
    const m = line.match(/^##\s+(R\d+):\s*(.+)$/);
    if (m) {
      cur = { id: m[1], title: m[2].trim(), body: [] };
      rules.push(cur);
    } else if (cur && /^\s*-\s+(Why|How to apply):/.test(line)) cur.body.push(line.trim().replace(/^-\s+/, ''));
  }
  return rules;
}
