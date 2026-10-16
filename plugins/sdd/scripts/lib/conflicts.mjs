// `sdd conflicts [--base <ref>]`: would merging the base into HEAD conflict? (REQ-VAL-8)
// Simulated with `git merge-tree --write-tree` (git ≥ 2.38); the working tree is never touched.
import { spawnSync } from 'node:child_process';
import { loadConfig } from './config.mjs';

export function conflicts(root, { base } = {}) {
  const ref = base || `origin/${loadConfig(root).config.base_branch}`;
  const r = spawnSync('git', ['-C', root, 'merge-tree', '--write-tree', '--name-only', '--no-messages', 'HEAD', ref], { encoding: 'utf8' });
  if (r.status === 0) return { exitCode: 0, base: ref, conflicts: [], message: `no conflicts with ${ref}` };
  if (r.status !== 1) return { exitCode: 3, base: ref, conflicts: null, message: `cannot simulate the merge with ${ref} (git ≥ 2.38 needed): ${r.stderr.trim()}` };
  // Output: the merged tree id, then one conflicted path per line.
  const files = [...new Set(r.stdout.split('\n').slice(1).filter(Boolean))];
  return { exitCode: 1, base: ref, conflicts: files, message: `conflicts with ${ref}: ${files.join(', ')}` };
}
