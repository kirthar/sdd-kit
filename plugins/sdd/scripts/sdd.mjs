#!/usr/bin/env node
// Single entry point for the sdd plugin's deterministic commands (docs/specs/README.md).
import path from 'node:path';
import { findRepoRoot, findProjectRoot } from './lib/git.mjs';
import { loadConfig } from './lib/config.mjs';
import { validate } from './lib/validate.mjs';
import { approve, UsageError } from './lib/approve.mjs';
import { archive } from './lib/archive.mjs';
import { newChange } from './lib/new.mjs';
import { status, formatStatus } from './lib/status.mjs';
import { tdd } from './lib/tdd.mjs';
import { scan } from './lib/scan.mjs';
import { context } from './lib/context.mjs';
import { detect } from './lib/detect.mjs';
import { doctor, collectDoctorFacts } from './lib/doctor.mjs';
import { initPlan, initApply } from './lib/init.mjs';
import { acquireLock, releaseLock, heartbeat, eligible, tripwires, preflight, writeReport } from './lib/autopilot.mjs';
import { releaseCheck } from './lib/release-check.mjs';
import fs from 'node:fs';

const EXIT = { ok: 0, fail: 1, usage: 2, env: 3 };
const argv = process.argv.slice(2);
const json = argv.includes('--json');
const args = argv.filter((a) => a !== '--json');
const [cmd, ...rest] = args;
const flag = (name) => rest.includes(name);
const opt = (name) => {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : undefined;
};
const positional = rest.filter((a, i) => !a.startsWith('--') && !(i > 0 && rest[i - 1].startsWith('--') && !['--all', '--specs', '--templates', '--merged-confirmed', '--apply', '--plan', '--ci'].includes(rest[i - 1])));

function emit(data, text, code = EXIT.ok) {
  process.stdout.write(json ? `${JSON.stringify(data, null, 2)}\n` : text ? `${text}\n` : '');
  process.exit(code);
}

function root() {
  const r = findProjectRoot(process.cwd());
  if (!r) {
    process.stderr.write('sdd: not inside a git repository\n');
    process.exit(EXIT.env);
  }
  return r;
}

const commands = {
  doctor() {
    const res = doctor(collectDoctorFacts(process.cwd()));
    emit(res, res.checks.map((c) => `${c.ok ? 'ok ' : 'FAIL'} ${c.name}: ${c.found ?? 'missing'}${c.ok ? '' : ` — ${c.hint}`}`).join('\n'), res.ok ? EXIT.ok : EXIT.env);
  },
  detect() {
    const res = detect(root());
    emit(res, JSON.stringify(res, null, 2));
  },
  config() {
    const res = loadConfig(root());
    emit(res.config, JSON.stringify(res.config, null, 2));
  },
  validate() {
    const opts = { all: flag('--all'), specs: flag('--specs'), templates: flag('--templates'), id: positional[0] };
    const findings = validate(root(), opts);
    const errors = findings.filter((f) => f.level === 'error');
    const text = findings.map((f) => `${f.rule} ${f.file}${f.line ? `:${f.line}` : ''} ${f.level === 'warn' ? '(warn) ' : ''}${f.message}`).join('\n') || 'validate: ok';
    emit({ findings }, text, errors.length ? EXIT.fail : EXIT.ok);
  },
  new() {
    const res = newChange(root(), { slug: positional[0], route: opt('--route'), capabilities: (opt('--capabilities') ?? '').split(',').filter(Boolean), signals: (opt('--signals') ?? '').split(',').filter(Boolean) });
    emit(res, res.message, res.ok ? EXIT.ok : EXIT.fail);
  },
  status() {
    const res = status(root());
    emit(res, formatStatus(res));
  },
  approve() {
    const res = approve(root(), positional);
    emit(res, res.message, res.ok ? EXIT.ok : EXIT.fail);
  },
  archive() {
    const res = archive(root(), positional[0], { mergedConfirmed: flag('--merged-confirmed') });
    emit(res, res.message, res.ok ? EXIT.ok : EXIT.fail);
  },
  tdd() {
    const sep = rest.indexOf('--');
    const res = tdd(root(), rest[0], sep >= 0 ? rest.slice(sep + 1) : []);
    emit(res, res.message, res.exitCode);
  },
  scan() {
    const files = [];
    for (let i = 0; i < rest.length; i++) if (rest[i] === '--file') files.push(rest[++i]);
    const res = scan(root(), { files, diffBase: opt('--diff') });
    emit(res, res.findings.map((f) => `${f.rule} ${f.file}:${f.line}`).join('\n') || 'scan: no secrets found', res.findings.length ? EXIT.fail : EXIT.ok);
  },
  init() {
    const r = root();
    if (flag('--apply')) {
      const res = initApply(r, { seed: (opt('--seed') ?? '').split(',').filter(Boolean), team: opt('--team'), ci: flag('--ci') });
      const findings = validate(r, { all: true }).filter((f) => f.level === 'error');
      emit({ ...res, findings }, `Wrote: ${res.written.join(', ')}${findings.length ? `\n${findings.map((f) => `${f.rule} ${f.file} ${f.message}`).join('\n')}` : ''}`, findings.length ? EXIT.fail : EXIT.ok);
    }
    const plan = initPlan(r);
    emit(plan, [`# Proposed .sdd/config.yaml${plan.configExists ? ' (exists — will be kept)' : ''}`, plan.config, `Unresolved commands: ${plan.unresolved.join(', ') || 'none'}`, `Files to write: ${plan.files.join(', ')}`, `Seed rule groups: ${plan.seedGroups.map((g) => `${g.name} (${g.rules.length})`).join(', ')}`].join('\n'));
  },
  autopilot() {
    const r = root();
    const sub = rest[0];
    const { config } = loadConfig(r);
    if (sub === 'preflight') {
      const p = preflight(r);
      emit(p, `mode: ${p.mode}${p.message ? ` — ${p.message}` : ''}`, p.mode === 'disabled' ? EXIT.fail : EXIT.ok);
    }
    if (sub === 'lock') {
      const l = acquireLock(r);
      emit(l, l.ok ? 'lock acquired' : 'skipped: locked', EXIT.ok);
    }
    if (sub === 'heartbeat') emit({ ok: true }, heartbeat(r) ?? 'ok');
    if (sub === 'unlock') emit({ ok: true }, releaseLock(r) ?? 'lock released');
    if (sub === 'eligible') {
      const e = eligible(r);
      const routed = e.eligible.map((t) => ({ ...t, tripwires: tripwires(config, t) }));
      emit({ eligible: routed, excluded: e.excluded }, [
        ...routed.map((t) => `${t.tripwires.length ? 'B' : 'A'} ${t.change}/${t.task} ${t.title}${t.tripwires.length ? ` [${t.tripwires.join(', ')}]` : ''}`),
        ...e.excluded.map((t) => `- ${t.change}/${t.task} excluded: ${t.reason}`),
      ].join('\n') || 'nothing eligible');
    }
    if (sub === 'report') {
      const data = JSON.parse(fs.readFileSync(opt('--from'), 'utf8'));
      const file = writeReport(r, data);
      emit({ file }, file);
    }
    process.stderr.write('usage: sdd autopilot <preflight|lock|heartbeat|unlock|eligible|report --from <json>>\n');
    process.exit(EXIT.usage);
  },
  'release-check'() {
    const r = root();
    const ids = positional.filter((p) => !p.includes('..'));
    const range = positional.find((p) => p.includes('..'));
    const res = releaseCheck(r, { ids, range });
    emit(res, `${res.lines.join('\n')}\nVerdict: ${res.verdict}`, res.verdict === 'BLOCK' ? EXIT.fail : EXIT.ok);
  },
  context() {
    const text = context(findProjectRoot(process.cwd()));
    emit({ text }, text);
  },
};

if (!commands[cmd]) {
  process.stderr.write(`usage: sdd <${Object.keys(commands).join('|')}> [args] [--json]\n`);
  process.exit(EXIT.usage);
}
try {
  commands[cmd]();
} catch (err) {
  process.stderr.write(`sdd ${cmd}: ${err.message}\n`);
  process.exit(err instanceof UsageError ? EXIT.usage : EXIT.fail);
}
export { path };
