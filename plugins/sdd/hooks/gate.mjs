// PreToolUse gate for Edit|Write|MultiEdit|NotebookEdit (docs/specs/hooks.md, REQ-HOOK-4..6).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from '../scripts/vendor/js-yaml.mjs';
import { findProjectRoot, readActive } from '../scripts/lib/git.mjs';
import { loadConfig } from '../scripts/lib/config.mjs';
import { loadChange, missingApprovals, nextCommand } from '../scripts/lib/changes.mjs';
import { matchesAny } from '../scripts/lib/glob.mjs';
import { autopilotActive } from '../scripts/lib/locks.mjs';

const TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const KIT_FILES = new Set(['.sdd/config.yaml', '.sdd/rules.md', '.sdd/constitution.md']);
const STATE_FILE = /^docs\/changes\/[^/]+\/state\.yaml$/;

const allow = () => ({ decision: 'allow' });
const block = (reason) => ({ decision: 'block', reason });

export function evaluate(payload) {
  if (!TOOLS.has(payload?.tool_name)) return allow();
  const input = payload.tool_input ?? {};
  const target = input.file_path ?? input.notebook_path;
  if (!target) return allow();
  const abs = path.resolve(payload.cwd ?? process.cwd(), target);
  const root = findProjectRoot(fs.existsSync(path.dirname(abs)) ? path.dirname(abs) : payload.cwd ?? process.cwd());
  if (!root) return allow();
  const rel = path.relative(root, realish(abs)).split(path.sep).join('/');
  if (rel.startsWith('..')) return allow();

  const { exists, config } = loadConfig(root);
  if (!exists || config.gates?.enforce === false) return allow();

  if (STATE_FILE.test(rel)) return checkApprovals(abs, payload.tool_name, input);
  if (KIT_FILES.has(rel) && autopilotActive(root)) {
    return block(`${rel} is owned by the person; the autopilot never edits kit config, rules or constitution.`);
  }
  if (rel.startsWith('docs/') || rel.startsWith('.sdd/') || matchesAny(rel, config.gates?.exempt)) return allow();

  const id = readActive(root);
  const change = id && loadChange(root, id);
  if (!change) {
    return block('no active change. Ask the person to start one with `/sdd:new "<description>"` and confirm it with `/sdd:approve <id> route`.');
  }
  const missing = missingApprovals(change.state);
  if (missing.length) {
    return block(`change ${id} (${change.state.route}) is missing approval: ${missing.join(', ')}. Next: ${nextCommand(change)} — approvals are a human act.`);
  }
  return allow();
}

// Resolve symlinks of the deepest existing ancestor so temp-dir aliases compare equal.
function realish(p) {
  let dir = p;
  const rest = [];
  while (!fs.existsSync(dir)) {
    rest.unshift(path.basename(dir));
    const parent = path.dirname(dir);
    if (parent === dir) return p;
    dir = parent;
  }
  return path.join(fs.realpathSync(dir), ...rest);
}

function checkApprovals(abs, tool, input) {
  const before = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
  const after = applyEdit(before, tool, input);
  if (after === null) return allow();
  const a = approvalsOf(before);
  const b = approvalsOf(after);
  if (b === undefined) return block('state.yaml must stay valid YAML.');
  for (const [phase, value] of Object.entries(b)) {
    if (JSON.stringify(a?.[phase]) !== JSON.stringify(value)) {
      return block(`approvals are recorded only by the person with \`/sdd:approve <id> ${phase}\`.`);
    }
  }
  return allow();
}

function applyEdit(text, tool, input) {
  if (tool === 'Write') return input.content ?? '';
  if (tool === 'Edit') return replace(text, input);
  if (tool === 'MultiEdit') return (input.edits ?? []).reduce((t, e) => (t === null ? null : replace(t, e)), text);
  return null;
}

function replace(text, { old_string: o = '', new_string: n = '', replace_all: all }) {
  if (!text.includes(o)) return null;
  return all ? text.split(o).join(n) : text.replace(o, () => n);
}

function approvalsOf(text) {
  try {
    const doc = yaml.load(text) ?? {};
    const ap = doc.approvals;
    if (!ap || typeof ap !== 'object') return {};
    const { plans, ...rest } = ap;
    const flat = { ...rest };
    for (const [t, v] of Object.entries(plans ?? {})) flat[`plan:${t}`] = v;
    return flat;
  } catch {
    return undefined;
  }
}

function main() {
  let data = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => (data += c));
  process.stdin.on('end', () => {
    let result;
    try {
      result = evaluate(JSON.parse(data));
    } catch (err) {
      process.stderr.write(`sdd-gate: warning: ${err.message}\n`);
      process.exit(0);
    }
    if (result.decision === 'block') {
      process.stderr.write(`sdd-gate: ${result.reason}\n`);
      process.exit(2);
    }
    process.exit(0);
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
