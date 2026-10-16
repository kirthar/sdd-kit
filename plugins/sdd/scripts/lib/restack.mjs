// `sdd restack`: integrate a slice branch after the slice below was squash-merged (REQ-LIFE-17).
// Merges only — no history rewrite, no force push — and no conflicts from the stack itself.
import { spawnSync } from 'node:child_process';
import { loadConfig } from './config.mjs';

export function restack(root, { squash, sliceHead, base } = {}) {
  if (!squash || !sliceHead) return { ok: false, message: 'usage: sdd restack --squash <sha> --slice-head <sha> [--base <ref>]' };
  const git = (...args) => spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  const target = base || `origin/${loadConfig(root).config.base_branch}`;
  if (git('status', '--porcelain').stdout.trim()) return { ok: false, message: 'working tree is not clean; commit or stash first' };
  if (git('merge-base', '--is-ancestor', sliceHead, 'HEAD').status !== 0) {
    return { ok: false, message: `${sliceHead} is not an ancestor of HEAD: this branch was not stacked on that slice` };
  }
  const subject = git('log', '-1', '--format=%s', squash).stdout.trim();
  // 1. The base as it was before the squash: conflicts here are other people's work, not the stack.
  const steps = [
    ['merge', '--no-edit', '-m', `chore: restack on the base before "${subject}"`, `${squash}^`],
    // 2. The squash only repeats the slice below, which this branch already holds through sliceHead.
    ['merge', '-s', 'ours', '-m', `chore: restack on "${subject}"`, squash],
    // 3. Whatever landed on the base after the squash.
    ['merge', '--no-edit', '-m', `chore: restack on ${target}`, target],
  ];
  for (const step of steps) {
    const r = git(...step);
    if (r.status !== 0) {
      const files = git('diff', '--name-only', '--diff-filter=U').stdout.trim().split('\n').filter(Boolean);
      return { ok: false, conflicts: files, message: `conflict merging ${step.at(-1)} (not from the stack): ${files.join(', ') || r.stderr.trim()}; resolve, test and commit` };
    }
  }
  return { ok: true, message: `restacked on ${target} after "${subject}"; push the branch and point its pull request at the base branch` };
}
