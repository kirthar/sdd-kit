import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export function tmpRepo(files = {}, { git = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-test-'));
  if (git) execFileSync('git', ['init', '-q', '-b', 'main', dir]);
  writeFiles(dir, files);
  return dir;
}

export function writeFiles(dir, files) {
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
}

export const CONFIG = 'version: 1\ngates: { enforce: true }\n';

export function state(id, route, approvals = []) {
  const a = approvals.length
    ? approvals.map((p) => `  ${p}: { by: Someone, at: 2026-01-01T00:00:00Z }`).join('\n')
    : '  {}';
  return `id: ${id}\nroute: ${route}\ncapabilities: [bookings]\napprovals:\n${a}\nprs: []\n`;
}
