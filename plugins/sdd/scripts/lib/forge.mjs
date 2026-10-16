// Repository settings that make the merge commit semantic (REQ-INIT-8). Prints; never applies.
import { loadConfig } from './config.mjs';

const METHODS = {
  squash: { allow_squash_merge: true, allow_merge_commit: false, allow_rebase_merge: false, squash_merge_commit_title: 'PR_TITLE', squash_merge_commit_message: 'PR_BODY' },
  merge: { allow_squash_merge: false, allow_merge_commit: true, allow_rebase_merge: false, merge_commit_title: 'PR_TITLE', merge_commit_message: 'PR_BODY' },
  rebase: { allow_squash_merge: false, allow_merge_commit: false, allow_rebase_merge: true },
};

export function forgeSettings(root) {
  const { pr } = loadConfig(root).config;
  if (pr.forge !== 'github') return { forge: pr.forge, merge: pr.merge, settings: {}, commands: [] };
  // delete_branch_on_merge retargets stacked pull requests to the base branch (REQ-LIFE-16).
  const settings = { ...METHODS[pr.merge], delete_branch_on_merge: true };
  const fields = Object.entries(settings).map(([k, v]) => (typeof v === 'boolean' ? `-F ${k}=${v}` : `-f ${k}=${v}`));
  return { forge: pr.forge, merge: pr.merge, settings, commands: [`gh api -X PATCH repos/{owner}/{repo} ${fields.join(' ')}`] };
}

export function formatForgeSettings(res) {
  if (!res.commands.length) return `pr.forge is ${res.forge}: no forge settings to apply`;
  const lines = Object.entries(res.settings).map(([k, v]) => `  ${k}: ${v}`);
  return [`Forge settings for pr.merge: ${res.merge}`, ...lines, 'Apply with:', ...res.commands.map((c) => `  ${c}`)].join('\n');
}
