import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpRepo, writeFiles } from './helpers.mjs';
import { detect, detectCommitFormat } from '../lib/detect.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => path.join(here, 'fixtures', 'stacks', name);
const pkg = (result, p = '.') => result.packages.find((x) => x.path === p);

// --- Acceptance criteria -------------------------------------------------

test('AC-INIT-2.1 node + pnpm lockfile → pnpm test / lint / format', () => {
  const r = detect(fixture('node-pnpm'));
  const { commands, stack } = pkg(r);
  assert.equal(stack, 'node');
  assert.equal(commands.test, 'pnpm test');
  assert.equal(commands.lint, 'pnpm lint');
  assert.equal(commands.format, 'pnpm format');
});

test('AC-INIT-2.2 maven with mvnw → ./mvnw test and -Dtest=<Name>', () => {
  const { commands, stack } = pkg(detect(fixture('maven-wrapper')));
  assert.equal(stack, 'maven');
  assert.equal(commands.test, './mvnw test');
  assert.equal(commands.test_single, './mvnw test -Dtest=<Name>');
});

test('AC-INIT-2.3 python with pytest and ruff → pytest / ruff check . / ruff format .', () => {
  const { commands, stack } = pkg(detect(fixture('python-pytest-ruff')));
  assert.equal(stack, 'python');
  assert.equal(commands.test, 'pytest');
  assert.equal(commands.lint, 'ruff check .');
  assert.equal(commands.format, 'ruff format .');
});

test('AC-INIT-2.4 Makefile test target → make test', () => {
  const { commands } = pkg(detect(fixture('makefile-node')));
  assert.equal(commands.test, 'make test');
});

test('AC-INIT-2.5 undetectable commands are empty and listed under unresolved', () => {
  const r = detect(fixture('unresolved'));
  assert.equal(r.packages.length, 1);
  const p = pkg(r);
  assert.equal(p.stack, 'unknown');
  for (const c of ['test', 'test_single', 'lint', 'format', 'build']) {
    assert.equal(p.commands[c], '', c);
    assert.ok(r.unresolved.includes(`.:${c}`), c);
  }
});

test('AC-INIT-3.1 ≥70% conventional subjects → conventional', () => {
  const subjects = [
    'feat(api): add bookings',
    'fix: handle empty list',
    'chore!: drop node 18',
    'docs: readme',
    'refactor(core): split module',
    'test: cover edge',
    'ci: cache deps',
    'Merge branch main',
    'wip',
    'feat: export csv',
  ];
  assert.equal(detectCommitFormat(subjects), 'conventional');
});

// --- Result shape --------------------------------------------------------

test('result shape: packages, base_branch, commit_format null, unresolved', () => {
  const r = detect(fixture('node-pnpm'));
  assert.deepEqual(Object.keys(r).sort(), ['base_branch', 'commit_format', 'packages', 'unresolved']);
  assert.equal(r.commit_format, null);
  assert.deepEqual(Object.keys(pkg(r).commands).sort(), ['build', 'format', 'lint', 'test', 'test_single']);
  assert.deepEqual(r.unresolved, ['.:build']);
  assert.equal(pkg(r).commands.build, '');
});

test('detect never spawns processes', () => {
  const src = fs.readFileSync(path.join(here, '..', 'lib', 'detect.mjs'), 'utf8');
  assert.doesNotMatch(src, /child_process/);
});

// --- Node ----------------------------------------------------------------

test('node without lockfile → npm, scripts via npm run', () => {
  const dir = tmpRepo({ 'package.json': JSON.stringify({ scripts: { test: 'jest', lint: 'eslint .', format: 'prettier -w .', build: 'tsc' } }) }, { git: false });
  const { commands } = pkg(detect(dir));
  assert.equal(commands.test, 'npm test');
  assert.equal(commands.test_single, 'npm test -- <Name>');
  assert.equal(commands.lint, 'npm run lint');
  assert.equal(commands.format, 'npm run format');
  assert.equal(commands.build, 'npm run build');
});

test('node with yarn.lock → yarn <script>', () => {
  const dir = tmpRepo({ 'yarn.lock': '', 'package.json': JSON.stringify({ scripts: { test: 'vitest', lint: 'eslint .' } }) }, { git: false });
  const { commands } = pkg(detect(dir));
  assert.equal(commands.test, 'yarn test');
  assert.equal(commands.test_single, 'yarn test <Name>');
  assert.equal(commands.lint, 'yarn lint');
});

test('node with bun.lockb → bun run <script> (bun test is the bun runner, not the script)', () => {
  const dir = tmpRepo({ 'bun.lockb': '', 'package.json': JSON.stringify({ scripts: { test: 'vitest', build: 'tsc' } }) }, { git: false });
  const { commands } = pkg(detect(dir));
  assert.equal(commands.test, 'bun run test');
  assert.equal(commands.build, 'bun run build');
});

test('node single-test is unresolved when the runner is not known to filter by name', () => {
  const dir = tmpRepo({ 'package.json': JSON.stringify({ scripts: { test: 'mocha' } }) }, { git: false });
  const r = detect(dir);
  assert.equal(pkg(r).commands.test, 'npm test');
  assert.equal(pkg(r).commands.test_single, '');
  assert.ok(r.unresolved.includes('.:test_single'));
});

test('node pnpm with vitest → pnpm test <Name>', () => {
  const { commands } = pkg(detect(fixture('node-pnpm')));
  assert.equal(commands.test_single, 'pnpm test <Name>');
});

test('npm default placeholder test script is not a test command', () => {
  const dir = tmpRepo({ 'package.json': JSON.stringify({ scripts: { test: 'echo "Error: no test specified" && exit 1' } }) }, { git: false });
  const r = detect(dir);
  assert.equal(pkg(r).commands.test, '');
  assert.ok(r.unresolved.includes('.:test'));
});

// --- Maven / Gradle ------------------------------------------------------

test('maven with spotless → lint/format and package build', () => {
  const { commands } = pkg(detect(fixture('maven-wrapper')));
  assert.equal(commands.lint, './mvnw spotless:check');
  assert.equal(commands.format, './mvnw spotless:apply');
  assert.equal(commands.build, './mvnw package');
});

test('maven without wrapper uses mvn; checkstyle gives lint only', () => {
  const dir = tmpRepo({ 'pom.xml': '<project><build><plugins><plugin><artifactId>maven-checkstyle-plugin</artifactId></plugin></plugins></build></project>' }, { git: false });
  const r = detect(dir);
  const { commands } = pkg(r);
  assert.equal(commands.test, 'mvn test');
  assert.equal(commands.test_single, 'mvn test -Dtest=<Name>');
  assert.equal(commands.lint, 'mvn checkstyle:check');
  assert.equal(commands.format, '');
  assert.deepEqual(r.unresolved, ['.:format']);
});

test('gradle with gradlew and spotless', () => {
  const r = detect(fixture('gradle-wrapper'));
  const { commands, stack } = pkg(r);
  assert.equal(stack, 'gradle');
  assert.equal(commands.test, './gradlew test');
  assert.equal(commands.test_single, './gradlew test --tests <Name>');
  assert.equal(commands.lint, './gradlew spotlessCheck');
  assert.equal(commands.format, './gradlew spotlessApply');
  assert.equal(commands.build, './gradlew build');
  assert.deepEqual(r.unresolved, []);
});

test('gradle groovy DSL without wrapper uses gradle and leaves lint unresolved', () => {
  const dir = tmpRepo({ 'build.gradle': "plugins { id 'java' }\n" }, { git: false });
  const r = detect(dir);
  assert.equal(pkg(r).commands.test, 'gradle test');
  assert.deepEqual(r.unresolved.sort(), ['.:format', '.:lint']);
});

// --- Python --------------------------------------------------------------

test('python build stays unresolved without a build tool lock', () => {
  const r = detect(fixture('python-pytest-ruff'));
  assert.equal(pkg(r).commands.test_single, 'pytest -k <name>');
  assert.deepEqual(r.unresolved, ['.:build']);
});

test('python with poetry.lock prefixes poetry run and builds with poetry', () => {
  const dir = tmpRepo({
    'pyproject.toml': '[tool.poetry]\nname = "x"\n[tool.poetry.group.dev.dependencies]\npytest = "^8"\nblack = "^24"\n',
    'poetry.lock': '',
  }, { git: false });
  const { commands } = pkg(detect(dir));
  assert.equal(commands.test, 'poetry run pytest');
  assert.equal(commands.test_single, 'poetry run pytest -k <name>');
  assert.equal(commands.format, 'poetry run black .');
  assert.equal(commands.lint, '');
  assert.equal(commands.build, 'poetry build');
});

test('python with uv.lock prefixes uv run', () => {
  const dir = tmpRepo({ 'pyproject.toml': '[dependency-groups]\ndev = ["pytest", "ruff"]\n', 'uv.lock': '' }, { git: false });
  const { commands } = pkg(detect(dir));
  assert.equal(commands.test, 'uv run pytest');
  assert.equal(commands.lint, 'uv run ruff check .');
  assert.equal(commands.build, 'uv build');
});

test('python setup.cfg with pytest', () => {
  const dir = tmpRepo({ 'setup.cfg': '[options.extras_require]\ntest = pytest\n' }, { git: false });
  const { commands, stack } = pkg(detect(dir));
  assert.equal(stack, 'python');
  assert.equal(commands.test, 'pytest');
});

test('python without a declared test runner leaves test unresolved', () => {
  const dir = tmpRepo({ 'pyproject.toml': '[project]\nname = "x"\n' }, { git: false });
  const r = detect(dir);
  assert.equal(pkg(r).stack, 'python');
  assert.ok(r.unresolved.includes('.:test'));
});

// --- Go / Cargo ----------------------------------------------------------

test('go module → go toolchain commands', () => {
  const r = detect(fixture('go'));
  assert.deepEqual(pkg(r), {
    path: '.',
    stack: 'go',
    commands: {
      test: 'go test ./...',
      test_single: 'go test ./... -run <Name>',
      lint: 'go vet ./...',
      format: 'gofmt -w .',
      build: 'go build ./...',
    },
  });
  assert.deepEqual(r.unresolved, []);
});

test('cargo crate → cargo commands', () => {
  const dir = tmpRepo({ 'Cargo.toml': '[package]\nname = "x"\n' }, { git: false });
  const { commands, stack } = pkg(detect(dir));
  assert.equal(stack, 'rust');
  assert.deepEqual(commands, {
    test: 'cargo test',
    test_single: 'cargo test <name>',
    lint: 'cargo clippy',
    format: 'cargo fmt',
    build: 'cargo build',
  });
});

// --- Makefile precedence -------------------------------------------------

test('Makefile targets win per command; scripts fill the rest', () => {
  const r = detect(fixture('makefile-node'));
  const { commands, stack } = pkg(r);
  assert.equal(stack, 'node');
  assert.equal(commands.lint, 'make lint');
  assert.equal(commands.format, 'npm run format');
  assert.equal(commands.build, 'npm run build');
  assert.equal(commands.test_single, 'node --test --test-name-pattern <Name>');
  assert.deepEqual(r.unresolved, []);
});

test('Makefile fmt target maps to format; Makefile-only repo is stack make', () => {
  const dir = tmpRepo({ Makefile: 'fmt:\n\tgofmt -w .\nbuild: deps\n\tcc main.c\nX := 1\n' }, { git: false });
  const r = detect(dir);
  const { commands, stack } = pkg(r);
  assert.equal(stack, 'make');
  assert.equal(commands.format, 'make fmt');
  assert.equal(commands.build, 'make build');
  assert.equal(commands.test, '');
});

test('Makefile wins over go toolchain', () => {
  const dir = tmpRepo({ 'go.mod': 'module x\n', Makefile: 'test:\n\tgo test -race ./...\n' }, { git: false });
  const { commands } = pkg(detect(dir));
  assert.equal(commands.test, 'make test');
  assert.equal(commands.test_single, 'go test ./... -run <Name>');
});

// --- Workspaces ----------------------------------------------------------

test('package.json workspaces → root plus one package per workspace dir', () => {
  const r = detect(fixture('monorepo-node-workspaces'));
  assert.deepEqual(r.packages.map((p) => p.path), ['.', 'packages/api', 'packages/web']);
  assert.equal(pkg(r).commands.lint, 'yarn lint');
  assert.equal(pkg(r, 'packages/api').commands.test, 'yarn test');
  assert.equal(pkg(r, 'packages/api').commands.test_single, 'yarn test <Name>');
  assert.equal(pkg(r, 'packages/api').commands.build, 'yarn build');
  assert.equal(pkg(r, 'packages/web').commands.lint, 'yarn lint');
  assert.ok(r.unresolved.includes('.:test'));
  assert.ok(r.unresolved.includes('packages/api:lint'));
  assert.ok(r.unresolved.includes('packages/web:build'));
});

test('pnpm-workspace.yaml packages, object-form workspaces and literal dirs', () => {
  const dir = tmpRepo({
    'package.json': JSON.stringify({ name: 'root' }),
    'pnpm-lock.yaml': '',
    'pnpm-workspace.yaml': "packages:\n  - 'apps/*'\n  - tools/cli\n  - '!apps/ignored'\n",
    'apps/one/package.json': JSON.stringify({ scripts: { test: 'vitest' } }),
    'apps/ignored/package.json': JSON.stringify({}),
    'apps/not-a-package/README.md': '',
    'tools/cli/package.json': JSON.stringify({ scripts: { build: 'tsc' } }),
  }, { git: false });
  const r = detect(dir);
  assert.deepEqual(r.packages.map((p) => p.path), ['.', 'apps/one', 'tools/cli']);
  assert.equal(pkg(r, 'apps/one').commands.test, 'pnpm test');
  assert.equal(pkg(r, 'tools/cli').commands.build, 'pnpm build');

  const dir2 = tmpRepo({
    'package.json': JSON.stringify({ workspaces: { packages: ['libs/*'] } }),
    'libs/a/package.json': JSON.stringify({ scripts: { lint: 'eslint .' } }),
  }, { git: false });
  assert.deepEqual(detect(dir2).packages.map((p) => p.path), ['.', 'libs/a']);
});

// --- Base branch ---------------------------------------------------------

test('base branch from origin HEAD symref', () => {
  const dir = tmpRepo({}, { git: false });
  writeFiles(dir, { '.git/refs/remotes/origin/HEAD': 'ref: refs/remotes/origin/develop\n', '.git/refs/heads/main': 'x' });
  assert.equal(detect(dir).base_branch, 'develop');
});

test('base branch main from local ref, master when only master exists', () => {
  const a = tmpRepo({}, { git: false });
  writeFiles(a, { '.git/refs/heads/main': 'x', '.git/refs/heads/master': 'x' });
  assert.equal(detect(a).base_branch, 'main');
  const b = tmpRepo({}, { git: false });
  writeFiles(b, { '.git/refs/heads/master': 'x' });
  assert.equal(detect(b).base_branch, 'master');
});

test('base branch from packed-refs', () => {
  const dir = tmpRepo({}, { git: false });
  writeFiles(dir, { '.git/packed-refs': '# pack-refs with: peeled\nabc123 refs/heads/master\n', '.git/refs/heads/.keep': '' });
  assert.equal(detect(dir).base_branch, 'master');
});

test('base branch defaults to main without git metadata', () => {
  assert.equal(detect(fixture('go')).base_branch, 'main');
});

test('base branch in a real fresh repository', () => {
  const dir = tmpRepo({ 'go.mod': 'module x\n' });
  assert.equal(detect(dir).base_branch, 'main');
});

// --- Commit format -------------------------------------------------------

test('commit format: ticket prefixes', () => {
  const s = ['ABC-12 add x', '[ABC-13] fix y', 'ABC-14: z', 'PRJ2-1 thing', 'misc'];
  assert.equal(detectCommitFormat(s), 'ticket-prefix');
});

test('commit format: free below threshold or empty', () => {
  assert.equal(detectCommitFormat(['feat: a', 'fix: b', 'update', 'more', 'stuff']), 'free');
  assert.equal(detectCommitFormat([]), 'free');
});

test('commit format: exactly 70% counts', () => {
  const s = [...Array(7).fill('fix: x'), 'a', 'b', 'c'];
  assert.equal(detectCommitFormat(s), 'conventional');
});

test('node:test script gets a name-pattern single-test command', () => {
  const dir = tmpRepo({ 'package.json': JSON.stringify({ scripts: { test: 'node --test' } }) }, { git: false });
  assert.equal(pkg(detect(dir)).commands.test_single, 'node --test --test-name-pattern <Name>');
});
