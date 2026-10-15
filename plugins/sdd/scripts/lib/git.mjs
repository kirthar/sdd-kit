// Git location helpers that never spawn a process, so hooks stay fast.
import fs from 'node:fs';
import path from 'node:path';

export function findRepoRoot(start) {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, '.git'))) return fs.realpathSync(dir);
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

// Per-worktree git directory: `.git` is a directory in the main checkout and a
// `gitdir: <path>` file in linked worktrees.
export function gitDir(root) {
  const dotGit = path.join(root, '.git');
  const st = fs.statSync(dotGit);
  if (st.isDirectory()) return fs.realpathSync(dotGit);
  const m = fs.readFileSync(dotGit, 'utf8').match(/^gitdir:\s*(.+)\s*$/m);
  if (!m) throw new Error(`unreadable .git file in ${root}`);
  return fs.realpathSync(path.resolve(root, m[1].trim()));
}

// Directory shared by all worktrees of one repository.
export function commonDir(gd) {
  const f = path.join(gd, 'commondir');
  if (!fs.existsSync(f)) return gd;
  return fs.realpathSync(path.resolve(gd, fs.readFileSync(f, 'utf8').trim()));
}

function activeFile(root) {
  return path.join(gitDir(findRepoRoot(root) ?? root), 'sdd', 'active');
}

export function readActive(root) {
  try {
    return fs.readFileSync(activeFile(root), 'utf8').trim() || null;
  } catch {
    return null;
  }
}

export function writeActive(root, id) {
  const f = activeFile(root);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, `${id}\n`);
}

export function sddCommonDir(root) {
  return path.join(commonDir(gitDir(findRepoRoot(root) ?? root)), 'sdd');
}

// Nearest directory with `.sdd/config.yaml` between `start` and the repository root; else the root.
export function findProjectRoot(start) {
  const repo = findRepoRoot(start);
  if (!repo) return null;
  let dir = fs.realpathSync(path.resolve(start));
  for (;;) {
    if (fs.existsSync(path.join(dir, '.sdd', 'config.yaml'))) return dir;
    if (dir === repo) return repo;
    const parent = path.dirname(dir);
    if (parent === dir) return repo;
    dir = parent;
  }
}
