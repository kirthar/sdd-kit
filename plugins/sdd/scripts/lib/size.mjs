// `sdd size [--base <ref>]`: changed lines of the branch against the review budget (REQ-VAL-7).
import { execFileSync } from 'node:child_process';
import { loadConfig } from './config.mjs';
import { matchesAny } from './glob.mjs';

export function size(root, { base } = {}) {
  const { config } = loadConfig(root);
  const ref = base || config.base_branch;
  const numstat = execFileSync('git', ['-C', root, 'diff', '--numstat', '--no-renames', `${ref}...HEAD`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  let counted = 0;
  let excluded = 0;
  for (const line of numstat.split('\n').filter(Boolean)) {
    const [added, deleted, file] = line.split('\t');
    if (added === '-') continue; // binary
    const n = Number(added) + Number(deleted);
    if (matchesAny(file, config.pr.size_exclude)) excluded += n;
    else counted += n;
  }
  const budget = config.pr.max_lines;
  return { base: ref, counted, excluded, budget, verdict: counted > budget ? 'over' : 'within' };
}

export function formatSize(r) {
  return `${r.counted} counted, ${r.excluded} excluded, budget ${r.budget} against ${r.base}: ${r.verdict}`;
}
