// Stack detection for `sdd detect`: a pure function of the file tree.
// It never spawns a process and never guesses: a command it cannot derive
// from a manifest, lockfile, wrapper or Makefile stays empty and is listed
// under `unresolved`.
import fs from 'node:fs';
import path from 'node:path';
import yaml from '../vendor/js-yaml.mjs';
import { gitDir, commonDir } from './git.mjs';

const COMMANDS = ['test', 'test_single', 'lint', 'format', 'build'];

// --- file helpers --------------------------------------------------------

const exists = (...p) => fs.existsSync(path.join(...p));

function read(...p) {
  try {
    return fs.readFileSync(path.join(...p), 'utf8');
  } catch {
    return null;
  }
}

function readJson(...p) {
  const text = read(...p);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const isDir = (p) => {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
};

// --- per-stack detectors -------------------------------------------------
// Each returns null when the stack is absent, else { stack, commands } with
// only the commands it can derive.

function packageManager(root) {
  if (exists(root, 'pnpm-lock.yaml')) return 'pnpm';
  if (exists(root, 'yarn.lock')) return 'yarn';
  if (exists(root, 'bun.lockb') || exists(root, 'bun.lock')) return 'bun';
  return 'npm';
}

// `npm test` is built in; other npm scripts need `run`. pnpm and yarn run
// scripts directly; `bun test` is bun's own runner, so scripts go via `run`.
function scriptCommand(pm, script) {
  if (pm === 'npm') return script === 'test' ? 'npm test' : `npm run ${script}`;
  if (pm === 'bun') return `bun run ${script}`;
  return `${pm} ${script}`;
}

const NPM_PLACEHOLDER_TEST = /no test specified/;
// Runners whose first positional argument filters tests by name/path.
const FILTERING_RUNNERS = /\b(vitest|jest)\b/;

function nodeStack(dir, pm) {
  const pkg = readJson(dir, 'package.json');
  if (!pkg) return null;
  const scripts = pkg.scripts || {};
  const has = (s) => typeof scripts[s] === 'string' && scripts[s].trim() !== '';
  const commands = {};
  if (has('test') && !NPM_PLACEHOLDER_TEST.test(scripts.test)) {
    commands.test = scriptCommand(pm, 'test');
    if (FILTERING_RUNNERS.test(scripts.test)) {
      commands.test_single = pm === 'npm' ? 'npm test -- <Name>' : `${scriptCommand(pm, 'test')} <Name>`;
    }
  }
  if (has('lint')) commands.lint = scriptCommand(pm, 'lint');
  if (has('format')) commands.format = scriptCommand(pm, 'format');
  else if (has('fmt')) commands.format = scriptCommand(pm, 'fmt');
  if (has('build')) commands.build = scriptCommand(pm, 'build');
  return { stack: 'node', commands };
}

function mavenStack(dir) {
  const pom = read(dir, 'pom.xml');
  if (pom === null) return null;
  const mvn = exists(dir, 'mvnw') ? './mvnw' : 'mvn';
  const commands = {
    test: `${mvn} test`,
    test_single: `${mvn} test -Dtest=<Name>`,
    build: `${mvn} package`,
  };
  if (/spotless-maven-plugin/.test(pom)) {
    commands.lint = `${mvn} spotless:check`;
    commands.format = `${mvn} spotless:apply`;
  } else if (/maven-checkstyle-plugin/.test(pom)) {
    commands.lint = `${mvn} checkstyle:check`;
  }
  return { stack: 'maven', commands };
}

function gradleStack(dir) {
  const build = read(dir, 'build.gradle.kts') ?? read(dir, 'build.gradle');
  if (build === null) return null;
  const gradle = exists(dir, 'gradlew') ? './gradlew' : 'gradle';
  const commands = {
    test: `${gradle} test`,
    test_single: `${gradle} test --tests <Name>`,
    build: `${gradle} build`,
  };
  if (/com\.diffplug\.spotless|\bspotless\b/.test(build)) {
    commands.lint = `${gradle} spotlessCheck`;
    commands.format = `${gradle} spotlessApply`;
  } else if (/\bcheckstyle\b/.test(build)) {
    commands.lint = `${gradle} checkstyleMain checkstyleTest`;
  }
  return { stack: 'gradle', commands };
}

function pythonStack(dir) {
  const pyproject = read(dir, 'pyproject.toml');
  const setupCfg = read(dir, 'setup.cfg');
  if (pyproject === null && setupCfg === null) return null;
  const text = [pyproject, setupCfg, read(dir, 'pytest.ini')].filter(Boolean).join('\n');
  const declares = (tool) => new RegExp(`(^|[^A-Za-z0-9_-])${tool}([^A-Za-z0-9_-]|$)`, 'm').test(text);
  let prefix = '';
  let build;
  if (exists(dir, 'poetry.lock')) {
    prefix = 'poetry run ';
    build = 'poetry build';
  } else if (exists(dir, 'uv.lock')) {
    prefix = 'uv run ';
    build = 'uv build';
  }
  const commands = {};
  if (declares('pytest') || exists(dir, 'pytest.ini')) {
    commands.test = `${prefix}pytest`;
    commands.test_single = `${prefix}pytest -k <name>`;
  }
  if (declares('ruff')) {
    commands.lint = `${prefix}ruff check .`;
    commands.format = `${prefix}ruff format .`;
  } else if (declares('black')) {
    commands.format = `${prefix}black .`;
  }
  if (!commands.lint && declares('flake8')) commands.lint = `${prefix}flake8`;
  if (build) commands.build = build;
  return { stack: 'python', commands };
}

function goStack(dir) {
  if (!exists(dir, 'go.mod')) return null;
  return {
    stack: 'go',
    commands: {
      test: 'go test ./...',
      test_single: 'go test ./... -run <Name>',
      lint: 'go vet ./...',
      format: 'gofmt -w .',
      build: 'go build ./...',
    },
  };
}

function cargoStack(dir) {
  if (!exists(dir, 'Cargo.toml')) return null;
  return {
    stack: 'rust',
    commands: {
      test: 'cargo test',
      test_single: 'cargo test <name>',
      lint: 'cargo clippy',
      format: 'cargo fmt',
      build: 'cargo build',
    },
  };
}

// Makefile targets win over raw tools for the same package.
function makeTargets(dir) {
  const text = read(dir, 'Makefile') ?? read(dir, 'makefile') ?? read(dir, 'GNUmakefile');
  if (text === null) return null;
  const targets = new Set();
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_.-]+(?:\s+[A-Za-z0-9_.-]+)*)\s*::?(?![=])/);
    if (m) for (const t of m[1].split(/\s+/)) targets.add(t);
  }
  const commands = {};
  for (const c of ['test', 'lint', 'build']) if (targets.has(c)) commands[c] = `make ${c}`;
  if (targets.has('format')) commands.format = 'make format';
  else if (targets.has('fmt')) commands.format = 'make fmt';
  return { stack: 'make', commands };
}

function detectPackage(root, rel, pm) {
  const dir = path.join(root, rel);
  const stacks = [nodeStack(dir, pm), mavenStack(dir), gradleStack(dir), pythonStack(dir), goStack(dir), cargoStack(dir)]
    .filter(Boolean);
  const make = makeTargets(dir);
  const layers = make ? [make, ...stacks] : stacks;
  const commands = {};
  for (const c of COMMANDS) {
    const hit = layers.find((l) => l.commands[c]);
    commands[c] = hit ? hit.commands[c] : '';
  }
  const stack = stacks.length ? stacks[0].stack : make ? 'make' : 'unknown';
  return { path: rel, stack, commands };
}

// --- workspaces ----------------------------------------------------------

function workspacePatterns(root) {
  const patterns = [];
  const pkg = readJson(root, 'package.json');
  if (pkg && pkg.workspaces) {
    const ws = Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces.packages;
    if (Array.isArray(ws)) patterns.push(...ws);
  }
  const pnpmWs = read(root, 'pnpm-workspace.yaml');
  if (pnpmWs !== null) {
    try {
      const doc = yaml.load(pnpmWs);
      if (doc && Array.isArray(doc.packages)) patterns.push(...doc.packages);
    } catch {
      // Unparseable workspace file: no workspace packages.
    }
  }
  return patterns.filter((p) => typeof p === 'string');
}

// Only `dir/*` globs and literal directories are supported.
function workspaceDirs(root) {
  const patterns = workspacePatterns(root);
  const excluded = new Set(patterns.filter((p) => p.startsWith('!')).map((p) => normalize(p.slice(1))));
  const dirs = new Set();
  for (const raw of patterns) {
    if (raw.startsWith('!')) continue;
    const p = normalize(raw);
    if (p.endsWith('/*') && !p.slice(0, -2).includes('*')) {
      const base = p.slice(0, -2);
      const abs = path.join(root, base);
      if (!isDir(abs)) continue;
      for (const name of fs.readdirSync(abs).sort()) {
        const rel = `${base}/${name}`;
        if (exists(root, rel, 'package.json')) dirs.add(rel);
      }
    } else if (!p.includes('*') && exists(root, p, 'package.json')) {
      dirs.add(p);
    }
  }
  return [...dirs].filter((d) => d !== '.' && !excluded.has(d)).sort();
}

function normalize(p) {
  return p.replace(/^\.\//, '').replace(/\/+$/, '');
}

// --- conventions ---------------------------------------------------------

function baseBranch(root) {
  let gd;
  let cd;
  try {
    gd = gitDir(root);
    cd = commonDir(gd);
  } catch {
    return 'main';
  }
  const originHead = read(cd, 'refs', 'remotes', 'origin', 'HEAD');
  if (originHead) {
    const m = originHead.match(/^ref:\s*refs\/remotes\/origin\/(.+?)\s*$/m);
    if (m) return m[1];
  }
  const packed = read(cd, 'packed-refs') || '';
  const hasBranch = (name) =>
    exists(cd, 'refs', 'heads', name) ||
    exists(cd, 'refs', 'remotes', 'origin', name) ||
    new RegExp(`\\srefs/(heads|remotes/origin)/${name}$`, 'm').test(packed) ||
    (read(gd, 'HEAD') || '').trim() === `ref: refs/heads/${name}`;
  if (hasBranch('main')) return 'main';
  if (hasBranch('master')) return 'master';
  return 'main';
}

const CONVENTIONAL = /^(feat|fix|chore|docs|refactor|test|perf|build|ci|style|revert)(\(.+\))?!?: /;
const TICKET_PREFIX = /^\[?[A-Z][A-Z0-9]+-\d+\]?:?\s/;
const THRESHOLD = 0.7;

export function detectCommitFormat(subjects) {
  const list = (subjects || []).filter((s) => typeof s === 'string');
  if (list.length === 0) return 'free';
  const share = (re) => list.filter((s) => re.test(s)).length / list.length;
  if (share(CONVENTIONAL) >= THRESHOLD) return 'conventional';
  if (share(TICKET_PREFIX) >= THRESHOLD) return 'ticket-prefix';
  return 'free';
}

// --- entry point ---------------------------------------------------------

export function detect(root) {
  const pm = packageManager(root);
  const paths = ['.', ...workspaceDirs(root)];
  const packages = paths.map((rel) => detectPackage(root, rel, pm));
  const unresolved = [];
  for (const p of packages) {
    for (const c of COMMANDS) if (!p.commands[c]) unresolved.push(`${p.path}:${c}`);
  }
  return { packages, base_branch: baseBranch(root), commit_format: null, unresolved };
}
