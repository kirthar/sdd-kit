import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { evaluate } from '../guard.mjs';

const GUARD = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'guard.mjs');

// A repository without spawning git: findRepoRoot/gitDir only need a `.git` directory.
function repo(files = {}) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-guard-')));
  fs.mkdirSync(path.join(dir, '.git'));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return dir;
}

// A linked worktree of `main`, shaped the way git lays it out on disk.
function linkedWorktree(main, name = 'wt') {
  const wt = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-guard-wt-')));
  const wtGitDir = path.join(main, '.git', 'worktrees', name);
  fs.mkdirSync(wtGitDir, { recursive: true });
  fs.writeFileSync(path.join(wtGitDir, 'commondir'), '../..\n');
  fs.writeFileSync(path.join(wt, '.git'), `gitdir: ${wtGitDir}\n`);
  return wt;
}

function heartbeat(main, ageMs = 0) {
  const dir = path.join(main, '.git', 'sdd', 'locks', 'pass');
  fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, 'heartbeat');
  fs.writeFileSync(f, String(Date.now()));
  const t = new Date(Date.now() - ageMs);
  fs.utimesSync(f, t, t);
}

const bash = (command, cwd) => ({ tool_name: 'Bash', tool_input: { command }, cwd });

delete process.env.SDD_CONFIG;
const DEFAULT_REPO = repo();

// AC-HOOK-1.1 — one row per blocked shape.
const BLOCKED = [
  // Change state named in heredoc code or through a write option of a read-only program
  ['state via python heredoc', "python3 - <<'EOF'\nopen('docs/changes/c1/state.yaml','a').write('  spec: x')\nEOF"],
  ['state via node heredoc', "node <<EOF\nrequire('fs').appendFileSync('docs/changes/c1/state.yaml', 'x')\nEOF"],
  ['state via git diff --output', 'git diff --output=docs/changes/c1/state.yaml'],
  ['state via less -o', 'less -o docs/changes/c1/state.yaml README.md'],
  // Push
  ['push --force', 'git push --force'],
  ['push -f', 'git push -f origin feat'],
  ['push --force-with-lease', 'git push --force-with-lease origin feat'],
  ['push --force-with-lease=<ref>', 'git push --force-with-lease=feat:abc123 origin feat'],
  ['push --force-if-includes', 'git push --force-if-includes origin feat'],
  ['push +ref', 'git push origin +feat'],
  ['push +src:dst', 'git push origin +HEAD:feat'],
  ['push --delete', 'git push --delete origin feat'],
  ['push -d', 'git push -d origin feat'],
  ['push :ref deletion', 'git push origin :feat'],
  ['push --mirror', 'git push --mirror origin'],
  ['push --prune', 'git push --prune origin'],
  ['push --no-verify', 'git push --no-verify origin feat'],
  ['push clustered -uf', 'git push -uf origin feat'],
  ['compound &&', 'git add . && git push origin feat'],
  ['compound ;', 'git commit -m x; git push'],
  ['compound ||', 'false || git push origin feat'],
  ['compound |', 'git push origin feat | tee push.log'],
  ['compound newline', 'git status\ngit push origin feat'],
  ['compound $()', 'echo $(git push origin feat)'],
  ['compound backticks', 'echo `git push origin feat`'],
  ['git -C dir', 'git -C ../other push -f'],
  ['leading env assignment', 'FOO=1 git push -f'],
  ['bash -c payload', "bash -c 'git push --force'"],
  ['sh -c payload', 'sh -c "git push -f origin feat"'],
  ['eval payload', 'eval "git push -f"'],
  ['absolute git path', '/usr/bin/git push --force'],
  ['env wrapper', 'env GIT_TRACE=1 git push -f'],
  ['git -c then push', 'git -c color.ui=never push --force origin feat'],
  // History
  ['commit --amend', 'git commit --amend'],
  ['commit --amend --no-edit', 'git commit -a --amend --no-edit'],
  ['rebase (merge default)', 'git rebase main'],
  ['rebase -i', 'git rebase -i HEAD~3'],
  ['filter-branch', 'git filter-branch --tree-filter "rm x" HEAD'],
  ['filter-repo', 'git filter-repo --path secrets'],
  ['reflog expire', 'git reflog expire --expire=now --all'],
  ['reflog delete', 'git reflog delete HEAD@{1}'],
  ['update-ref -d', 'git update-ref -d refs/heads/feat'],
  // Local destruction
  ['branch -D', 'git branch -D feat'],
  ['branch --delete --force', 'git branch --delete --force feat'],
  ['branch -d -f', 'git branch -d -f feat'],
  ['reset --hard', 'git reset --hard HEAD~1'],
  ['clean -fd', 'git clean -fd'],
  ['clean -xdf', 'git clean -xdf'],
  ['clean --force', 'git clean --force'],
  ['checkout -- path', 'git checkout -- src/a.js'],
  ['checkout rev -- path', 'git checkout HEAD -- .'],
  ['restore worktree', 'git restore src/a.js'],
  ['restore --worktree --staged', 'git restore --staged --worktree src/a.js'],
  ['worktree remove --force', 'git worktree remove --force ../wt'],
  ['worktree remove -f', 'git worktree remove -f ../wt'],
  ['stash drop', 'git stash drop'],
  ['stash clear', 'git stash clear'],
  // Forge
  ['gh pr merge', 'gh pr merge 12'],
  ['gh pr merge --auto', 'gh pr merge --squash --auto'],
  ['gh pr review', 'gh pr review 12 --approve'],
  ['--reviewer', 'gh pr create --draft --title t --body b --reviewer someone'],
  ['--add-reviewer', 'gh pr edit 12 --add-reviewer someone'],
  ['gh pr ready (auto_ready false)', 'gh pr ready 12'],
  ['gh pr create without --draft', 'gh pr create --title t --body b'],
  ['gh repo delete', 'gh repo delete owner/repo --yes'],
  ['gh api -X DELETE', 'gh api -X DELETE repos/o/r/git/refs/heads/feat'],
  ['gh api --method=DELETE', 'gh api --method=DELETE repos/o/r'],
  ['gh api merge endpoint', 'gh api -X PUT repos/o/r/pulls/1/merge'],
  ['gh api reviews with fields', 'gh api repos/o/r/pulls/1/reviews -f event=APPROVE'],
  ['gh api requested_reviewers', "gh api repos/o/r/pulls/1/requested_reviewers -f 'reviewers[]=x'"],
  ['gh api graphql merge mutation', "gh api graphql -f query='mutation { mergePullRequest(input:{}) { clientMutationId } }'"],
  // Escape hatches
  ['config alias.*', "git config alias.p 'push --force'"],
  ['config push.*', 'git config --global push.default current'],
  ['config receive.*', 'git config receive.denyNonFastForwards false'],
  ['config remote.*.push', 'git config remote.origin.push +refs/heads/*:refs/heads/*'],
  ['config url.*', 'git config url.ssh://example.invalid/.insteadOf https://example.invalid/'],
  ['config core.hooksPath', 'git config core.hooksPath /dev/null'],
  ['config --unset core.hooksPath', 'git config --unset core.hooksPath'],
  ['config set (new syntax)', 'git config set alias.x y'],
  ['config key is case-insensitive', 'git config core.hookspath /dev/null'],
  ['git -c core.hooksPath', 'git -c core.hooksPath=/dev/null commit -m x'],
  ['commit --no-verify', 'git commit --no-verify -m x'],
  ['commit -n clustered', 'git commit -nm x'],
  // Mentions
  ['mention in pr create body', 'gh pr create --draft --title t --body "cc @someone"'],
  ['mention in issue create body', "gh issue create --title t --body 'ping @someone please'"],
  ['mention in pr comment', 'gh pr comment 12 --body "thanks @someone"'],
  ['mention in issue comment -b', 'gh issue comment 3 -b "@someone see this"'],
  ['team mention in pr edit', 'gh pr edit 12 --body "owner: @org/team"'],
  ['mention in --body=', 'gh pr comment 12 --body="hi @someone"'],
  ['mention in heredoc body', "gh pr create --draft --title t --body \"$(cat <<'EOF'\nSummary\n\nThanks @someone\nEOF\n)\""],
  // Approvals
  ['sdd.mjs approve', 'node plugins/sdd/scripts/sdd.mjs approve add-x route'],
  ['sdd.mjs approve executed directly', './plugins/sdd/scripts/sdd.mjs approve add-x spec'],
  ['redirect > to state.yaml', 'echo "approvals: {spec: x}" > docs/changes/add-x/state.yaml'],
  ['heredoc >> to state.yaml', 'cat >> docs/changes/add-x/state.yaml <<EOF\napprovals:\n  spec: {}\nEOF'],
  ['tee to state.yaml', 'printf x | tee docs/changes/add-x/state.yaml'],
  ['tee -a to state.yaml', 'tee -a ./docs/changes/add-x/state.yaml < approvals.txt'],
  ['sed -i to state.yaml', "sed -i '' 's/a/b/' docs/changes/add-x/state.yaml"],
  ['sed -i.bak to state.yaml', "sed -i.bak 's/a/b/' docs/changes/add-x/state.yaml"],
  ['node -e append to state.yaml', "node -e \"require('fs').appendFileSync('docs/changes/c1/state.yaml', 'approvals: {}')\""],
  ['node --eval write to state.yaml', "node --eval \"require('fs').writeFileSync('docs/changes/c1/state.yaml', 'x')\""],
  ['python3 -c write to state.yaml', "python3 -c \"open('docs/changes/c1/state.yaml', 'w').write('x')\""],
  ['ruby -e write to state.yaml', "ruby -e \"File.write('docs/changes/c1/state.yaml', 'x')\""],
  ['dd of= state.yaml', 'dd if=approvals.txt of=docs/changes/c1/state.yaml'],
  ['truncate state.yaml', 'truncate -s 0 docs/changes/c1/state.yaml'],
  ['cp onto state.yaml', 'cp approvals.yaml docs/changes/c1/state.yaml'],
  ['bash -c python write', "bash -c \"python3 -c \\\"open('docs/changes/c1/state.yaml','a').write('x')\\\"\""],
  ['git checkout of state.yaml', 'git checkout feat -- docs/changes/c1/state.yaml'],
  // Unparseable git/gh
  ['unparseable git', 'git push "unterminated'],
  ['unparseable gh', "gh pr create --body 'oops"],
];

const ALLOWED = [
  ['grep -o reads a change state file', 'grep -o spec docs/changes/c1/state.yaml'],
  'git push -u origin HEAD',
  'git push origin feat',
  'git push origin feat 2>&1',
  'git commit -m "x"',
  'git commit -m "use --amend later"',
  'gh pr create --draft --base main --title t --body b',
  'gh pr create -d --title t --body b',
  'git status',
  'git log --oneline',
  'git log --grep="push -f"',
  'grep -r "push --force" docs',
  'grep "git push --force" notes.md',
  "echo 'git reset --hard'",
  "cat <<'EOF'\ngit push --force\nEOF",
  'ls # git push -f',
  'git branch -d feat',
  'git branch -f feat HEAD',
  'git restore --staged src/a.js',
  'git checkout feat',
  'git checkout -b feat',
  'git worktree remove ../wt',
  'git stash',
  'git stash list',
  'git config --get alias.p',
  'git config --list',
  'git config get alias.x',
  'git config user.name "Someone"',
  'git fetch && git status',
  'gh pr view 12',
  'gh pr ready --undo 12',
  'gh api repos/o/r/pulls/1/reviews',
  'gh pr create --draft --title t --body "use `@Override` here"',
  'gh pr create --draft --title t --body "mail dev@example.invalid"',
  "gh pr create --draft --title t --body \"$(cat <<'EOF'\n```java\n@Override\nvoid run() {}\n```\nEOF\n)\"",
  'cat docs/changes/add-x/state.yaml',
  'grep approvals docs/changes/c1/state.yaml',
  'head -n 5 docs/changes/c1/state.yaml',
  'git diff docs/changes/c1/state.yaml',
  'git log -p docs/changes/c1/state.yaml',
  'git add docs/changes/c1/state.yaml',
  'git commit -m "docs: update docs/changes/c1/state.yaml" -- docs/changes/c1/state.yaml',
  'git restore --staged docs/changes/c1/state.yaml',
  'echo "see docs/changes/c1/state.yaml"',
  'node plugins/sdd/scripts/sdd.mjs validate docs/changes/c1/state.yaml',
  'node plugins/sdd/scripts/sdd.mjs status',
  'echo sdd.mjs approve',
  'echo "not a quote\'s end"',
  'echo "unterminated',
];

describe('blocked shapes (AC-HOOK-1.1)', () => {
  test('fixture has at least 45 cases', () => assert.ok(BLOCKED.length >= 45));
  for (const [name, command] of BLOCKED) {
    test(name, () => {
      const r = evaluate(bash(command, DEFAULT_REPO));
      assert.equal(r.decision, 'block', `expected block: ${command}`);
      assert.ok(r.reason && r.reason.length > 0);
      assert.equal(r.handoff, `Run it yourself if intended: ! ${command}`);
    });
  }
});

describe('no false positives (REQ-HOOK-2)', () => {
  test('fixture has at least 15 cases', () => assert.ok(ALLOWED.length >= 15));
  for (const command of ALLOWED) {
    test(JSON.stringify(command), () => {
      const r = evaluate(bash(command, DEFAULT_REPO));
      assert.equal(r.decision, 'allow', `expected allow: ${command} (${r.reason})`);
    });
  }
  test('non-Bash tools are ignored', () => {
    const r = evaluate({ tool_name: 'Write', tool_input: { file_path: 'x', content: 'git push -f' }, cwd: DEFAULT_REPO });
    assert.equal(r.decision, 'allow');
  });
  test('unparseable non-git command allows with a warning', () => {
    const r = evaluate(bash("echo 'oops", DEFAULT_REPO));
    assert.equal(r.decision, 'allow');
    assert.match(r.warning, /parse/);
  });
});

describe('hand-off (REQ-HOOK-3)', () => {
  test('AC-HOOK-3.1 repeats the exact command', () => {
    const command = 'git push --force-with-lease origin feat';
    const r = evaluate(bash(command, DEFAULT_REPO));
    assert.equal(r.decision, 'block');
    assert.ok(r.handoff.includes('! git push --force-with-lease origin feat'));
  });
});

describe('config-dependent rows', () => {
  test('rebase allowed when git.integration is rebase', () => {
    const dir = repo({ '.sdd/config.yaml': 'version: 1\ngit: { integration: rebase }\n' });
    assert.equal(evaluate(bash('git rebase main', dir)).decision, 'allow');
  });
  test('rebase blocked when git.integration is merge', () => {
    const dir = repo({ '.sdd/config.yaml': 'version: 1\ngit: { integration: merge }\n' });
    assert.equal(evaluate(bash('git rebase main', dir)).decision, 'block');
  });
  test('gh pr ready allowed when pr.auto_ready', () => {
    const dir = repo({ '.sdd/config.yaml': 'version: 1\npr: { auto_ready: true }\n' });
    assert.equal(evaluate(bash('gh pr ready 12', dir)).decision, 'allow');
  });
  test('gh pr create without --draft allowed when pr.draft is false', () => {
    const dir = repo({ '.sdd/config.yaml': 'version: 1\npr: { draft: false }\n' });
    assert.equal(evaluate(bash('gh pr create --title t --body b', dir)).decision, 'allow');
  });
  test('config is read from the repo above a nested cwd', () => {
    const dir = repo({ '.sdd/config.yaml': 'version: 1\ngit: { integration: rebase }\n', 'src/a.js': '' });
    assert.equal(evaluate(bash('git rebase main', path.join(dir, 'src'))).decision, 'allow');
  });
});

describe('--body-file mentions', () => {
  test('mention in body file blocks', () => {
    const dir = repo({ 'body.md': '## Summary\n\nThanks @someone for the review.\n' });
    const r = evaluate(bash('gh pr create --draft --title t --body-file body.md', dir));
    assert.equal(r.decision, 'block');
    assert.match(r.reason, /@someone/);
  });
  test('-F short form', () => {
    const dir = repo({ 'body.md': 'cc @someone\n' });
    assert.equal(evaluate(bash('gh issue comment 3 -F body.md', dir)).decision, 'block');
  });
  test('mentions only in code are allowed', () => {
    const dir = repo({ 'body.md': 'Uses `@Override`.\n\n```java\n@Deprecated\nclass A {}\n```\n\nmail dev@example.invalid\n' });
    assert.equal(evaluate(bash('gh pr create --draft --title t --body-file body.md', dir)).decision, 'allow');
  });
  test('missing body file does not block', () => {
    const dir = repo();
    assert.equal(evaluate(bash('gh pr create --draft --title t --body-file nope.md', dir)).decision, 'allow');
  });
});

describe('autopilot mode', () => {
  test('main checkout: non-allowed git verb blocks', () => {
    const main = repo();
    heartbeat(main);
    const r = evaluate(bash('git commit -m x', main));
    assert.equal(r.decision, 'block');
    assert.match(r.reason, /autopilot/);
  });
  test('main checkout: fetch, worktree add/list/prune and read-only verbs allowed', () => {
    const main = repo();
    heartbeat(main);
    for (const c of ['git fetch origin', 'git worktree add ../wt -b feat', 'git worktree list', 'git worktree prune',
      'git worktree remove ../wt', 'git status', 'git log --oneline', 'git diff', 'git rev-parse HEAD', 'git branch --show-current']) {
      assert.equal(evaluate(bash(c, main)).decision, 'allow', c);
    }
  });
  test('main checkout: branch creation and checkout block', () => {
    const main = repo();
    heartbeat(main);
    for (const c of ['git checkout feat', 'git branch feat', 'git merge feat', 'git pull']) {
      assert.equal(evaluate(bash(c, main)).decision, 'block', c);
    }
  });
  test('linked worktree: normal git work allowed', () => {
    const main = repo();
    heartbeat(main);
    const wt = linkedWorktree(main);
    assert.equal(evaluate(bash('git commit -m x', wt)).decision, 'allow');
  });
  test('git -C <main> from a worktree is blocked', () => {
    const main = repo();
    heartbeat(main);
    const wt = linkedWorktree(main);
    assert.equal(evaluate(bash(`git -C ${main} commit -m x`, wt)).decision, 'block');
  });
  test('writes to kit config files block', () => {
    const main = repo();
    heartbeat(main);
    const wt = linkedWorktree(main);
    for (const c of ['echo x > .sdd/config.yaml', 'echo x >> .sdd/rules.md', "sed -i 's/a/b/' .sdd/constitution.md", 'tee .sdd/config.yaml < x']) {
      assert.equal(evaluate(bash(c, wt)).decision, 'block', c);
    }
  });
  test('stale heartbeat is not autopilot mode', () => {
    const main = repo();
    heartbeat(main, 20 * 60 * 1000);
    assert.equal(evaluate(bash('git commit -m x', main)).decision, 'allow');
    assert.equal(evaluate(bash('echo x > .sdd/config.yaml', main)).decision, 'allow');
  });
  test('without a lock, kit config writes are allowed', () => {
    const main = repo();
    assert.equal(evaluate(bash('echo x > .sdd/rules.md', main)).decision, 'allow');
  });
});

describe('performance (AC-HOOK-6.1)', () => {
  test('100 evaluations p95 < 200 ms in a repo with 1,000 change folders', () => {
    const dir = repo({ '.sdd/config.yaml': 'version: 1\n' });
    for (let i = 0; i < 1000; i++) {
      const p = path.join(dir, 'docs', 'changes', `c-${i}`);
      fs.mkdirSync(p, { recursive: true });
      fs.writeFileSync(path.join(p, 'state.yaml'), `id: c-${i}\n`);
    }
    heartbeat(dir);
    const commands = ['git push -u origin HEAD', 'gh pr create --title t --body "x @a"', 'git rebase main',
      "bash -c 'git status && git log'", 'echo x > docs/changes/c-1/state.yaml'];
    const times = [];
    for (let i = 0; i < 100; i++) {
      const t0 = process.hrtime.bigint();
      evaluate(bash(commands[i % commands.length], dir));
      times.push(Number(process.hrtime.bigint() - t0) / 1e6);
    }
    times.sort((a, b) => a - b);
    assert.ok(times[94] < 200, `p95 ${times[94]} ms`);
  });
});

describe('end to end (stdin protocol)', () => {
  const run = (input) => spawnSync(process.execPath, [GUARD], { input, encoding: 'utf8' });
  test('blocked command exits 2 with reason and hand-off', () => {
    const r = run(JSON.stringify(bash('git push --force origin feat', DEFAULT_REPO)));
    assert.equal(r.status, 2);
    assert.match(r.stderr, /^sdd-guard: .+/m);
    assert.ok(r.stderr.includes('Run it yourself if intended: ! git push --force origin feat'));
  });
  test('allowed command exits 0 silently', () => {
    const r = run(JSON.stringify(bash('git status', DEFAULT_REPO)));
    assert.equal(r.status, 0);
    assert.equal(r.stdout, '');
    assert.equal(r.stderr, '');
  });
  test('malformed input exits 0 with a warning', () => {
    const r = run('{not json');
    assert.equal(r.status, 0);
    assert.match(r.stderr, /sdd-guard/);
  });
});
