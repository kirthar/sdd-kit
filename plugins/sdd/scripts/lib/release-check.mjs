// `sdd release-check`: block a release while a change's pull request is not merged (REQ-REL).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import yaml from '../vendor/js-yaml.mjs';
import { loadConfig } from './config.mjs';
import { changesDir } from './changes.mjs';

export function ghPr(root) {
  return (url) => {
    try {
      return JSON.parse(execFileSync('gh', ['pr', 'view', url, '--json', 'state,mergedAt,baseRefName'], { cwd: root, encoding: 'utf8', timeout: 30000 }));
    } catch {
      return null;
    }
  };
}

function changeState(root, id) {
  for (const dir of [path.join(changesDir(root), id), path.join(changesDir(root), 'archive', id)]) {
    const f = path.join(dir, 'state.yaml');
    if (fs.existsSync(f)) return { dir, state: yaml.load(fs.readFileSync(f, 'utf8')) ?? {} };
  }
  return null;
}

export function idsInRange(root, range) {
  let r = range;
  if (!r) {
    try {
      r = `${execFileSync('git', ['-C', root, 'describe', '--tags', '--abbrev=0'], { encoding: 'utf8' }).trim()}..HEAD`;
    } catch {
      r = 'HEAD';
    }
  }
  const out = execFileSync('git', ['-C', root, 'log', '--name-only', '--format=', r], { encoding: 'utf8' });
  const ids = new Set();
  for (const m of out.matchAll(/^docs\/changes\/(?:archive\/)?([a-z0-9][a-z0-9-]*)\/state\.yaml$/gm)) ids.add(m[1]);
  return [...ids];
}

export function releaseCheck(root, { ids, range, gh = ghPr(root) } = {}) {
  const { config } = loadConfig(root);
  const branch = config.release?.branch ?? config.base_branch ?? 'main';
  const scope = ids?.length ? ids : idsInRange(root, range);
  const lines = [];
  let block = false;
  let warn = false;
  for (const id of scope) {
    const c = changeState(root, id);
    if (!c) {
      lines.push(`WARN  ${id}: change folder not found`);
      warn = true;
      continue;
    }
    const prs = c.state.prs ?? [];
    if (!prs.length && fs.existsSync(path.join(c.dir, 'tasks.md'))) {
      lines.push(`WARN  ${id}: has tasks but no pull request recorded`);
      warn = true;
    }
    for (const url of prs) {
      const info = config.pr?.forge === 'none' ? null : gh(url);
      if (!info) {
        lines.push(`WARN  ${id}: ${url} not checked (forge unavailable) — open it and confirm it is merged`);
        warn = true;
      } else if (info.state !== 'MERGED') {
        lines.push(`BLOCK ${id}: ${url} is ${info.state}`);
        block = true;
      } else if (info.baseRefName && info.baseRefName !== branch) {
        lines.push(`WARN  ${id}: ${url} merged into ${info.baseRefName}, not ${branch}`);
        warn = true;
      } else lines.push(`OK    ${id}: ${url} merged`);
    }
  }
  if (!scope.length) lines.push('No changes in scope.');
  return { verdict: block ? 'BLOCK' : warn ? 'WARN' : 'OK', lines, scope };
}
