// Autopilot pass lock. "Autopilot mode" = the pass lock exists with a fresh heartbeat.
import fs from 'node:fs';
import path from 'node:path';
import { sddCommonDir } from './git.mjs';

export const HEARTBEAT_TTL_MS = 10 * 60 * 1000;

export function passLockDir(root) {
  return path.join(sddCommonDir(root), 'locks', 'pass');
}

export function autopilotActive(root, now = Date.now()) {
  try {
    const st = fs.statSync(path.join(passLockDir(root), 'heartbeat'));
    return now - st.mtimeMs < HEARTBEAT_TTL_MS;
  } catch {
    return false;
  }
}
