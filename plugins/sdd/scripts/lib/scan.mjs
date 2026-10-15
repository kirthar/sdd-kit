// `sdd scan`: secret patterns; reports rule and location, never the value (REQ-VAL-3).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const SECRET_RULES = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/],
  ['cloud-key', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ['forge-token', /\b(?:ghp|gho|ghs|ghu|ghr)_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}\b|\bglpat-[A-Za-z0-9_-]{20,}\b/],
  ['chat-token', /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/],
  ['jwt', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/],
  ['assignment', /\b(?:api[_-]?key|secret|token|password|passwd)\s*[:=]\s*["']?([A-Za-z0-9+/_\-]{20,})/i],
];

function entropy(s) {
  const f = {};
  for (const c of s) f[c] = (f[c] ?? 0) + 1;
  return Object.values(f).reduce((h, n) => h - (n / s.length) * Math.log2(n / s.length), 0);
}

export function scanText(text, file) {
  const findings = [];
  text.split('\n').forEach((line, i) => {
    for (const [rule, re] of SECRET_RULES) {
      const m = line.match(re);
      if (!m) continue;
      if (rule === 'assignment' && entropy(m[1]) < 3.5) continue;
      findings.push({ rule, file, line: i + 1 });
    }
  });
  return findings;
}

export function scan(root, { files = [], diffBase } = {}) {
  const findings = [];
  for (const f of files) findings.push(...scanText(fs.readFileSync(path.resolve(root, f), 'utf8'), f));
  if (diffBase) {
    const diff = execFileSync('git', ['-C', root, 'diff', '--unified=0', `${diffBase}...HEAD`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    let file = null;
    let line = 0;
    for (const l of diff.split('\n')) {
      if (l.startsWith('+++ ')) file = l.slice(6);
      else if (l.startsWith('@@')) line = Number(l.match(/\+(\d+)/)?.[1] ?? 0) - 1;
      else if (l.startsWith('+') && file) {
        line++;
        findings.push(...scanText(l.slice(1), file).map((x) => ({ ...x, line })));
      }
    }
  }
  return { findings };
}
