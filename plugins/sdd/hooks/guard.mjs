// PreToolUse guard (matcher `Bash`): blocks irreversible git/forge actions, approval bypasses and,
// in autopilot mode, changes to the main checkout. Spawns no processes and only reads files.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, ParseError, shortFlags, basename } from './lib/shell.mjs';
import { findRepoRoot, sddCommonDir } from '../scripts/lib/git.mjs';
import { loadConfig, DEFAULTS } from '../scripts/lib/config.mjs';
import { findAttribution } from '../scripts/lib/attribution.mjs';

const HEARTBEAT_TTL_MS = 10 * 60 * 1000;
const MAX_DEPTH = 5;

class Block extends Error {}

export function evaluate(payload) {
  const command = payload?.tool_input?.command;
  if (payload?.tool_name !== 'Bash' || typeof command !== 'string' || !command.trim()) return allow();
  const handoff = `Run it yourself if intended: ! ${command}`;
  const block = (reason) => ({ decision: 'block', reason, handoff });
  const ctx = new Context(payload.cwd || process.cwd());
  try {
    const cmds = expand(parse(command), 0);
    for (const cmd of cmds) checkCommand(cmd, ctx);
    if (cmds.length > 1 && cmds.some((c) => gitVerb(c)?.verb === 'push')) {
      throw new Block('compound command containing git push; run the push on its own');
    }
    return ctx.warning ? { ...allow(), warning: ctx.warning } : allow();
  } catch (err) {
    if (err instanceof Block) return block(err.message);
    if (err instanceof ParseError) {
      if (/(^|[^\w-])(git|gh)([^\w-]|$)/.test(command)) return block(`cannot parse a git/gh command (${err.message})`);
      return { ...allow(), warning: `could not parse command (${err.message}); allowing` };
    }
    return { ...allow(), warning: `internal error (${err?.message ?? err}); allowing` };
  }
}

function allow() {
  return { decision: 'allow', reason: '', handoff: '' };
}

// ---------------------------------------------------------------------------------------------
// Context: lazily loaded config and autopilot state.

class Context {
  constructor(cwd) {
    this.cwd = path.resolve(cwd);
    this.warning = '';
    this._config = undefined;
    this._autopilot = new Map();
  }

  get config() {
    if (this._config === undefined) {
      try {
        const root = findRepoRoot(this.cwd);
        this._config = root ? loadConfig(root).config : structuredClone(DEFAULTS);
      } catch (err) {
        this.warning = `unreadable config (${err.message}); using defaults`;
        this._config = structuredClone(DEFAULTS);
      }
    }
    return this._config;
  }

  // Returns { autopilot, main } for the repository containing `dir`.
  repoState(dir) {
    const root = safe(() => findRepoRoot(dir));
    if (!root) return { autopilot: false, main: false };
    if (!this._autopilot.has(root)) {
      const main = safe(() => fs.statSync(path.join(root, '.git')).isDirectory()) ?? false;
      const autopilot = safe(() => {
        const hb = path.join(sddCommonDir(root), 'locks', 'pass', 'heartbeat');
        return Date.now() - fs.statSync(hb).mtimeMs < HEARTBEAT_TTL_MS;
      }) ?? false;
      this._autopilot.set(root, { autopilot, main });
    }
    return this._autopilot.get(root);
  }
}

function safe(fn) {
  try {
    return fn();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------------------------
// Expansion: flatten nested substitutions and replace wrappers (`bash -c`, `eval`, `env`, ...)
// by the command they run.

function expand(parsed, depth) {
  if (depth > MAX_DEPTH) throw new ParseError('nesting too deep');
  const out = [];
  for (const cmd of parsed.commands) {
    for (const sub of cmd.subs) out.push(...expand(sub, depth + 1));
    const argv = unwrap(cmd.argv);
    const payload = shellPayload(argv);
    if (payload !== null) {
      out.push(...expand(parse(payload), depth + 1));
      if (cmd.redirects.length) out.push({ ...cmd, argv: [] });
      continue;
    }
    out.push({ ...cmd, argv });
  }
  return out;
}

const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;

function unwrap(argv) {
  let a = argv.slice();
  for (let guard = 0; guard < 10; guard++) {
    while (a.length && ASSIGNMENT.test(a[0])) a.shift();
    if (!a.length) return a;
    const name = basename(a[0]);
    if (name === 'env') {
      a.shift();
      while (a.length && (a[0].startsWith('-') || ASSIGNMENT.test(a[0]))) {
        const opt = a.shift();
        if (opt === '-u' || opt === '-C' || opt === '-S') a.shift();
      }
    } else if (['command', 'builtin', 'exec', 'nohup', 'time'].includes(name)) {
      a.shift();
      while (a.length && a[0].startsWith('-')) a.shift();
    } else if (name === 'sudo' || name === 'doas') {
      a.shift();
      while (a.length && a[0].startsWith('-')) {
        const opt = a.shift();
        if (['-u', '-g', '-C', '-D', '-h', '-p', '-r', '-t', '-U'].includes(opt)) a.shift();
      }
    } else if (name === 'nice' || name === 'ionice') {
      a.shift();
      while (a.length && a[0].startsWith('-')) {
        const opt = a.shift();
        if (opt === '-n' || opt === '-c') a.shift();
      }
    } else if (name === 'timeout') {
      a.shift();
      while (a.length && a[0].startsWith('-')) {
        const opt = a.shift();
        if (opt === '-s' || opt === '-k') a.shift();
      }
      a.shift(); // duration
    } else if (name === 'xargs') {
      a.shift();
      while (a.length && a[0].startsWith('-')) {
        const opt = a.shift();
        if (/^-[IEdLnPs]$/.test(opt) || ['-a', '--arg-file', '--delimiter', '--max-args'].includes(opt)) a.shift();
      }
    } else {
      return a;
    }
  }
  return a;
}

const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh']);

function shellPayload(argv) {
  if (!argv.length) return null;
  const name = basename(argv[0]);
  if (name === 'eval') return argv.slice(1).join(' ');
  if (!SHELLS.has(name)) return null;
  for (let k = 1; k < argv.length; k++) {
    const arg = argv[k];
    if (!arg.startsWith('-') || arg === '-' || arg === '--') break;
    if (/^-[a-zA-Z]*c[a-zA-Z]*$/.test(arg)) return argv[k + 1] ?? '';
    if (arg === '-o' || arg === '+o') k++;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Rules.

function checkCommand(cmd, ctx) {
  checkWrites(cmd, ctx);
  const argv = cmd.argv;
  if (!argv.length) return;
  checkStateNamed(argv, cmd.heredocs);
  const name = basename(argv[0]);
  if (name === 'git') return checkGit(cmd, ctx);
  if (name === 'gh') return checkGh(argv, ctx, cmd.heredocs);
  checkApprove(argv);
}

// --- shell writes ------------------------------------------------------------------------------

const STATE_YAML = /(^|\/)docs\/changes\/[^/]+\/state\.yaml$/;
const KIT_FILES = /(^|\/)\.sdd\/(config\.yaml|rules\.md|constitution\.md)$/;

function writeTargets(cmd) {
  const targets = cmd.redirects.filter((r) => r.op.includes('>') && !/^\d*>&$/.test(r.op)).map((r) => r.target);
  const argv = cmd.argv;
  if (!argv.length) return targets;
  const name = basename(argv[0]);
  const rest = argv.slice(1);
  if (name === 'tee') targets.push(...rest.filter((a) => !a.startsWith('-')));
  if (name === 'sed' || name === 'gsed') {
    const inPlace = rest.some((a) => a.startsWith('--in-place') || (/^-[a-zA-Z]+/.test(a) && !a.startsWith('--') && a.slice(1).includes('i')));
    if (inPlace) targets.push(...rest.filter((a) => !a.startsWith('-')));
  }
  if (name === 'perl' && rest.some((a) => /^-[a-zA-Z]*i/.test(a))) targets.push(...rest.filter((a) => !a.startsWith('-')));
  if (name === 'cp' || name === 'mv' || name === 'install') {
    const pos = rest.filter((a) => !a.startsWith('-'));
    if (pos.length) targets.push(pos[pos.length - 1]);
  }
  return targets;
}

function normalise(target, cwd) {
  return path.resolve(cwd, target).split(path.sep).join('/');
}

function checkWrites(cmd, ctx) {
  for (const t of writeTargets(cmd)) {
    if (!t) continue;
    const abs = normalise(t, ctx.cwd);
    if (STATE_YAML.test(abs) || STATE_YAML.test(t)) {
      throw new Block(`shell write to ${t}: approvals are recorded by the person via /sdd:approve, not by the agent`);
    }
    if ((KIT_FILES.test(abs) || KIT_FILES.test(t)) && ctx.repoState(ctx.cwd).autopilot) {
      throw new Block(`autopilot mode: ${t} is owned by the person and cannot be changed by a pass`);
    }
  }
}

// Any command whose text (quoted arguments and inline code included) names a change state file is
// blocked unless its program only reads or stages. Paths built at run time are not detected (ADR-0003).
const STATE_YAML_TEXT = /docs\/changes\/[^/\s'"`]+\/state\.yaml/;
const READ_ONLY = new Set(['cat', 'head', 'tail', 'less', 'more', 'grep', 'rg', 'wc', 'ls', 'stat', 'file', 'diff', 'echo']);
const SDD_READ_VERBS = new Set(['validate', 'status', 'context']);
const GIT_READ_VERBS = new Set(['diff', 'log', 'show', 'status', 'add', 'commit']);

// Options that make an otherwise read-only program write a file.
const WRITE_OPTIONS = { git: /^--output(=|$)/, less: /^(-o|-O|--log-file|--LOG-FILE)/ };

function namesStateOnlyToRead(argv) {
  const name = basename(argv[0]);
  const writeOption = WRITE_OPTIONS[name];
  if (writeOption && argv.slice(1).some((a) => writeOption.test(a))) return false;
  if (READ_ONLY.has(name)) return true;
  const isSdd = (a) => basename(a) === 'sdd.mjs' || basename(a) === 'sdd';
  const sddArgs = isSdd(argv[0]) ? argv.slice(1) : name === 'node' && argv[1] && isSdd(argv[1]) ? argv.slice(2) : null;
  if (sddArgs) return SDD_READ_VERBS.has(sddArgs.find((a) => !a.startsWith('-')));
  if (name === 'git') {
    const verb = argv.slice(1).find((a, k, all) => !a.startsWith('-') && !(k > 0 && ['-C', '-c'].includes(all[k - 1])));
    if (GIT_READ_VERBS.has(verb)) return true;
    return verb === 'restore' && argv.includes('--staged') && !argv.includes('--worktree');
  }
  return false;
}

function checkStateNamed(argv, heredocs = []) {
  const named = argv.some((a) => STATE_YAML_TEXT.test(a)) || heredocs.some((h) => STATE_YAML_TEXT.test(h.body));
  if (!named) return;
  if (namesStateOnlyToRead(argv)) return;
  throw new Block('command names a change state file: approvals are recorded by the person via /sdd:approve, not by the agent');
}

// --- sdd approve -------------------------------------------------------------------------------

function checkApprove(argv) {
  // The sdd CLI is the program itself (`sdd.mjs approve`) or the script run by node.
  let rest = null;
  const isSdd = (a) => basename(a) === 'sdd.mjs' || basename(a) === 'sdd';
  if (isSdd(argv[0])) rest = argv.slice(1);
  else if (basename(argv[0]) === 'node') {
    const script = argv.findIndex((a, k) => k > 0 && !a.startsWith('-'));
    if (script !== -1 && isSdd(argv[script])) rest = argv.slice(script + 1);
  }
  if (!rest) return;
  const verb = rest.find((a) => !a.startsWith('-'));
  if (verb === 'approve') {
    throw new Block('approvals cannot be recorded from the Bash tool; ask the person to run /sdd:approve');
  }
}

// --- git ---------------------------------------------------------------------------------------

const GIT_GLOBAL_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--config-env', '--super-prefix', '--exec-path']);

// Splits `git [globals] <verb> <args>`; returns null when there is no verb.
function gitVerb(cmd) {
  const argv = cmd.argv;
  if (!argv.length || basename(argv[0]) !== 'git') return null;
  const dirs = [];
  const configs = [];
  let workTree = null;
  let k = 1;
  while (k < argv.length && argv[k].startsWith('-')) {
    const a = argv[k];
    if (GIT_GLOBAL_WITH_VALUE.has(a)) {
      const v = argv[k + 1] ?? '';
      if (a === '-C') dirs.push(v);
      if (a === '-c') configs.push(v);
      if (a === '--work-tree') workTree = v;
      k += 2;
      continue;
    }
    if (a.startsWith('--work-tree=')) workTree = a.slice(12);
    k++;
  }
  if (k >= argv.length) return null;
  return { verb: argv[k], args: argv.slice(k + 1), dirs, configs, workTree };
}

function hasLong(args, ...names) {
  return args.some((a) => names.some((n) => a === n || a.startsWith(`${n}=`)));
}

function hasShort(args, letter, takesValue = '') {
  return args.some((a) => !a.startsWith('--') && shortFlags(a, takesValue).has(letter));
}

function positionals(args, valueOpts = []) {
  const out = [];
  for (let k = 0; k < args.length; k++) {
    const a = args[k];
    if (a === '--') {
      out.push(...args.slice(k + 1));
      break;
    }
    if (valueOpts.includes(a)) {
      k++;
      continue;
    }
    if (a.startsWith('-') && a !== '-') continue;
    out.push(a);
  }
  return out;
}

function checkGit(cmd, ctx) {
  const g = gitVerb(cmd);
  if (!g) return;
  const { verb, args } = g;
  for (const c of g.configs) {
    const key = c.split('=')[0];
    if (isEscapeKey(key)) throw new Block(`git -c ${key} overrides a protected setting`);
  }
  switch (verb) {
    case 'push':
      checkPush(args);
      break;
    case 'commit':
      if (hasLong(args, '--amend')) throw new Block('git commit --amend rewrites history; make a new commit instead');
      if (hasLong(args, '--no-verify') || hasShort(args, 'n', 'mFCctuS')) throw new Block('git commit --no-verify skips the hooks');
      checkAttribution([...args, ...heredocBodies(cmd.heredocs), ...fileContents(args, ['-F', '--file'], ctx)]);
      break;
    case 'rebase':
      if (ctx.config.git?.integration !== 'rebase') throw new Block('git rebase is disabled (git.integration: merge); merge the base branch instead');
      break;
    case 'filter-branch':
    case 'filter-repo':
      throw new Block(`git ${verb} rewrites history`);
    case 'reflog':
      if (args[0] === 'expire' || args[0] === 'delete') throw new Block(`git reflog ${args[0]} destroys recovery points`);
      break;
    case 'update-ref':
      if (hasShort(args, 'd') || hasLong(args, '--delete')) throw new Block('git update-ref -d deletes a ref');
      break;
    case 'branch': {
      const del = hasShort(args, 'D') || ((hasLong(args, '--delete') || hasShort(args, 'd')) && (hasLong(args, '--force') || hasShort(args, 'f')));
      if (del) throw new Block('force-deleting a branch can lose unmerged commits; use git branch -d');
      break;
    }
    case 'reset':
      if (hasLong(args, '--hard')) throw new Block('git reset --hard discards local changes');
      break;
    case 'clean':
      if (hasLong(args, '--force') || hasShort(args, 'f', 'e')) throw new Block('git clean -f deletes untracked files');
      break;
    case 'checkout': {
      const dd = args.indexOf('--');
      if (dd !== -1 && dd < args.length - 1) throw new Block('git checkout -- <path> discards local changes');
      break;
    }
    case 'restore': {
      const staged = hasLong(args, '--staged') || hasShort(args, 'S', 's');
      const worktree = hasLong(args, '--worktree') || hasShort(args, 'W', 's');
      if (!staged || worktree) throw new Block('git restore without --staged discards local changes');
      break;
    }
    case 'worktree':
      if (args[0] === 'remove' && (hasLong(args, '--force') || hasShort(args, 'f'))) {
        throw new Block('git worktree remove --force discards the worktree\'s changes');
      }
      break;
    case 'stash':
      if (args[0] === 'drop' || args[0] === 'clear') throw new Block(`git stash ${args[0]} deletes stashed work`);
      break;
    case 'config':
      checkGitConfig(args);
      break;
    default:
  }
  checkAutopilotGit(g, ctx);
}

function checkPush(args) {
  const flags = [
    ['--force', 'force push'],
    ['--force-with-lease', 'force push'],
    ['--force-if-includes', 'force push'],
    ['--delete', 'remote branch deletion'],
    ['--mirror', 'mirror push'],
    ['--prune', 'pruning remote branches'],
    ['--no-verify', 'push --no-verify skips the hooks'],
  ];
  for (const [flag, what] of flags) {
    if (hasLong(args, flag)) throw new Block(`git push ${flag} is blocked (${what})`);
  }
  if (hasShort(args, 'f', 'o')) throw new Block('git push -f is blocked (force push)');
  if (hasShort(args, 'd', 'o')) throw new Block('git push -d is blocked (remote branch deletion)');
  const pos = positionals(args, ['-o', '--push-option', '--repo', '--receive-pack', '--exec']);
  for (const ref of pos.slice(1)) {
    if (ref.startsWith('+')) throw new Block(`git push ${ref} is blocked (+ refspec forces the update)`);
    if (ref.startsWith(':')) throw new Block(`git push ${ref} is blocked (deletes the remote ref)`);
  }
}

function isEscapeKey(key) {
  const k = key.toLowerCase();
  return /^(alias|push|receive|url)\./.test(k) || /^remote\..+\.(push|pushurl)$/.test(k) || k === 'core.hookspath';
}

const CONFIG_READ = ['--get', '--get-all', '--get-regexp', '--get-urlmatch', '--list', '--get-color', '--get-colorbool'];
const CONFIG_WRITE_OPTS = ['--unset', '--unset-all', '--add', '--replace-all'];
const CONFIG_VALUE_OPTS = ['-f', '--file', '--blob', '--type', '--default', '--comment', '--value', '--config-env'];

function checkGitConfig(args) {
  if (hasLong(args, ...CONFIG_READ) || hasShort(args, 'l')) return;
  if (hasLong(args, '--edit') || hasShort(args, 'e')) throw new Block('git config --edit can change protected settings');
  const pos = positionals(args, CONFIG_VALUE_OPTS);
  let key = null;
  let section = false;
  if (hasLong(args, '--rename-section', '--remove-section')) {
    key = pos[0];
    section = true;
  } else if (['get', 'list'].includes(pos[0])) {
    return;
  } else if (['set', 'unset'].includes(pos[0])) {
    key = pos[1];
  } else if (['rename-section', 'remove-section'].includes(pos[0])) {
    key = pos[1];
    section = true;
  } else if (pos[0] === 'edit') {
    throw new Block('git config edit can change protected settings');
  } else if (hasLong(args, ...CONFIG_WRITE_OPTS) || pos.length >= 2) {
    key = pos[0];
  }
  if (!key) return;
  const blocked = section ? /^(alias|push|receive|url|remote)(\.|$)/i.test(key) : isEscapeKey(key);
  if (blocked) throw new Block(`git config write to ${key} is an escape hatch around the guard`);
}

// Autopilot: in the main checkout only fetch, worktree add|list|remove|prune and read-only verbs.
const READ_ONLY_VERBS = new Set([
  'status', 'log', 'show', 'diff', 'rev-parse', 'rev-list', 'ls-files', 'ls-tree', 'ls-remote', 'cat-file',
  'describe', 'blame', 'shortlog', 'grep', 'show-ref', 'for-each-ref', 'merge-base', 'name-rev', 'cherry',
  'whatchanged', 'range-diff', 'check-ignore', 'check-attr', 'count-objects', 'var', 'help', 'version',
  'diff-tree', 'diff-index', 'diff-files', 'verify-commit', 'verify-tag', 'fsck',
]);

function isReadOnlyGit(verb, args) {
  if (READ_ONLY_VERBS.has(verb)) return true;
  if (verb === 'fetch') return true;
  if (verb === 'worktree') return ['add', 'list', 'remove', 'prune'].includes(args[0]);
  if (verb === 'stash') return ['list', 'show'].includes(args[0]);
  if (verb === 'reflog') return !args[0] || args[0] === 'show' || args[0].startsWith('-');
  if (verb === 'config') return hasLong(args, ...CONFIG_READ) || hasShort(args, 'l') || ['get', 'list'].includes(args.find((a) => !a.startsWith('-'))) || positionals(args, CONFIG_VALUE_OPTS).length === 1;
  if (verb === 'remote') return !args.length || ['-v', '--verbose', 'show', 'get-url'].includes(args[0]);
  if (verb === 'branch') {
    if (hasLong(args, '--show-current', '--list', '--contains', '--no-contains', '--merged', '--no-merged', '--points-at')) return true;
    return !positionals(args, ['--format', '--sort', '--color', '--abbrev']).length && !hasShort(args, 'd') && !hasShort(args, 'D') && !hasShort(args, 'm') && !hasShort(args, 'M') && !hasShort(args, 'c') && !hasShort(args, 'C') && !hasLong(args, '--delete', '--move', '--copy', '--set-upstream-to', '--unset-upstream', '--edit-description');
  }
  if (verb === 'tag') return !positionals(args, ['--format', '--sort']).length || hasShort(args, 'l') || hasLong(args, '--list');
  return false;
}

function checkAutopilotGit(g, ctx) {
  let dir = ctx.cwd;
  for (const d of g.dirs) dir = path.resolve(dir, d);
  if (g.workTree) dir = path.resolve(dir, g.workTree);
  const state = ctx.repoState(dir);
  if (!state.autopilot || !state.main) return;
  if (isReadOnlyGit(g.verb, g.args)) return;
  throw new Block(`autopilot mode: git ${g.verb} is not allowed against the main checkout; work in a worktree`);
}

// --- gh ----------------------------------------------------------------------------------------

function ghVerb(argv) {
  const pos = [];
  let k = 1;
  for (; k < argv.length && pos.length < 2; k++) {
    const a = argv[k];
    if (a === '-R' || a === '--repo') {
      k++;
      continue;
    }
    if (a.startsWith('-')) continue;
    pos.push(a);
  }
  return { group: pos[0], verb: pos[1], args: argv.slice(k) };
}

function checkGh(argv, ctx, heredocs = []) {
  const { group, verb, args } = ghVerb(argv);
  const all = argv.slice(1);
  if (group === 'api') return checkGhApi(argv.slice(argv.indexOf('api') + 1));
  if (group === 'repo' && verb === 'delete') throw new Block('gh repo delete is irreversible');
  if (group === 'pr' || group === 'issue') {
    if (group === 'pr' && verb === 'merge') throw new Block('gh pr merge: merging is the person\'s decision');
    if (group === 'pr' && verb === 'review') throw new Block('gh pr review: reviews are the person\'s decision');
    if (hasLong(all, '--reviewer', '--add-reviewer') || (group === 'pr' && verb === 'create' && hasShort(args, 'r', 'abBdFHlmpt'))) {
      throw new Block('requesting reviewers is the person\'s decision');
    }
    if (group === 'pr' && verb === 'ready' && !hasLong(args, '--undo') && !ctx.config.pr?.auto_ready) {
      throw new Block('gh pr ready is disabled (pr.auto_ready: false); the person marks the PR ready');
    }
    if (group === 'pr' && verb === 'create' && ctx.config.pr?.draft !== false && !hasLong(args, '--draft') && !hasShort(args, 'd', 'aBbFHlmprt')) {
      throw new Block('gh pr create without --draft (pr.draft: true); add --draft');
    }
    if (['create', 'comment', 'edit'].includes(verb)) checkMentions(args, ctx);
    if (group === 'pr' && (verb === 'create' || verb === 'edit')) {
      checkAttribution([...args, ...heredocBodies(heredocs), ...fileContents(args, ['--body-file', '-F'], ctx)]);
    }
  }
}

function checkGhApi(args) {
  let method = null;
  let hasFields = false;
  let endpoint = null;
  const fields = [];
  for (let k = 0; k < args.length; k++) {
    const a = args[k];
    if (a === '-X' || a === '--method') method = args[++k];
    else if (a.startsWith('--method=')) method = a.slice(9);
    else if (/^-X./.test(a)) method = a.slice(2);
    else if (['-f', '-F', '--field', '--raw-field'].includes(a)) {
      hasFields = true;
      fields.push(args[++k] ?? '');
    } else if (/^--(raw-)?field=/.test(a)) {
      hasFields = true;
      fields.push(a.slice(a.indexOf('=') + 1));
    } else if (a === '--input') {
      hasFields = true;
      k++;
    } else if (['-H', '--header', '-q', '--jq', '-t', '--template', '--hostname', '--cache', '-p', '--preview'].includes(a)) k++;
    else if (!a.startsWith('-') && endpoint === null) endpoint = a;
  }
  const m = (method || (hasFields ? 'POST' : 'GET')).toUpperCase();
  if (m === 'DELETE') throw new Block(`gh api ${m} is irreversible`);
  if (endpoint === 'graphql') {
    const q = fields.join(' ');
    if (/\b(mergePullRequest|enablePullRequestAutoMerge|addPullRequestReview|submitPullRequestReview|requestReviews|delete\w*)\b/.test(q)) {
      throw new Block('gh api graphql mutation merges, reviews or deletes');
    }
    return;
  }
  if (m !== 'GET' && endpoint && /\/(merge|merges|reviews|requested_reviewers)(\/|$|\?)/.test(endpoint)) {
    throw new Block(`gh api ${m} ${endpoint} merges or reviews`);
  }
}

// --- AI attribution ----------------------------------------------------------------------------

function checkAttribution(texts) {
  for (const text of texts) {
    const line = findAttribution(text);
    if (line) throw new Block(`"${line}" credits an AI assistant; commits and pull requests carry no AI attribution`);
  }
}

function heredocBodies(heredocs = []) {
  return heredocs.map((h) => h.body);
}

// Contents of the files named by `flags` (`-F f`, `--file f`, `--file=f`); `-` (stdin) is skipped.
function fileContents(args, flags, ctx) {
  const out = [];
  for (let k = 0; k < args.length; k++) {
    const a = args[k];
    const eq = flags.find((f) => f.startsWith('--') && a.startsWith(`${f}=`));
    const file = eq ? a.slice(eq.length + 1) : flags.includes(a) ? args[++k] : null;
    if (!file || file === '-') continue;
    const text = safe(() => fs.readFileSync(path.resolve(ctx.cwd, file), 'utf8'));
    if (text !== null) out.push(text);
  }
  return out;
}

// --- mentions ----------------------------------------------------------------------------------

function checkMentions(args, ctx) {
  const bodies = [];
  for (let k = 0; k < args.length; k++) {
    const a = args[k];
    if (a === '--body' || a === '-b') bodies.push(args[++k] ?? '');
    else if (a.startsWith('--body=')) bodies.push(a.slice(7));
    else if (a === '--body-file' || a === '-F' || a.startsWith('--body-file=')) {
      const file = a.includes('=') ? a.slice(a.indexOf('=') + 1) : args[++k];
      if (file && file !== '-') {
        const text = safe(() => fs.readFileSync(path.resolve(ctx.cwd, file), 'utf8'));
        if (text !== null) bodies.push(text);
      }
    }
  }
  for (const body of bodies) {
    const handle = findMention(body);
    if (handle) throw new Block(`${handle} would notify someone; mentions are the person's decision (wrap code in backticks)`);
  }
}

export function findMention(text) {
  const prose = text
    .replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(^ {0,3}\1[^\n]*$|$(?![\s\S]))/gm, '')
    .replace(/(`+)[\s\S]*?\1/g, '');
  const m = /(?:^|[^\w.+\-/`@])@([A-Za-z0-9](?:[A-Za-z0-9-]{0,38})(?:\/[A-Za-z0-9][\w.-]*)?)/.exec(prose);
  return m ? `@${m[1]}` : null;
}

// ---------------------------------------------------------------------------------------------
// stdin wrapper.

async function main() {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  let payload;
  try {
    payload = JSON.parse(input);
  } catch (err) {
    process.stderr.write(`sdd-guard: warning: unreadable hook input (${err.message}); allowing\n`);
    process.exit(0);
  }
  const r = evaluate(payload);
  if (r.decision === 'block') {
    process.stderr.write(`sdd-guard: ${r.reason}\n${r.handoff}\n`);
    process.exit(2);
  }
  if (r.warning) process.stderr.write(`sdd-guard: warning: ${r.warning}\n`);
  process.exit(0);
}

const isMain = (() => {
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();
if (isMain) main();
