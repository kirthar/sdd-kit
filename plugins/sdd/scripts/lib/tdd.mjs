// `sdd tdd red|green -- <cmd>`: run a test command, assert the expected outcome, log it (REQ-VAL-4).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { readActive, sddCommonDir } from './git.mjs';

export function tdd(root, phase, cmd) {
  if (!['red', 'green'].includes(phase) || !cmd.length) return { exitCode: 2, message: 'usage: sdd tdd red|green -- <command>' };
  const r = spawnSync(cmd[0], cmd.slice(1), { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  const code = r.status ?? 1;
  const change = readActive(root) ?? 'none';
  const file = path.join(sddCommonDir(root), 'tdd', `${change}.log`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify({ time: new Date().toISOString(), change, phase, cmd: cmd.join(' '), exit: code })}\n`);
  if (phase === 'red' && code === 0) return { exitCode: 1, message: 'expected failure, got success: the test must fail before the code exists' };
  if (phase === 'green' && code !== 0) return { exitCode: 1, message: `expected success, got exit ${code}` };
  return { exitCode: 0, message: `${phase}: ok (exit ${code})` };
}

export function readTddLog(root, change) {
  const file = path.join(sddCommonDir(root), 'tdd', `${change}.log`);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
}
