// Small, line-oriented Markdown readers for the kit's own artifact formats.
import yaml from '../vendor/js-yaml.mjs';

export function splitFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: text, offset: 0 };
  let data = {};
  try {
    data = yaml.load(m[1]) ?? {};
  } catch {
    data = {};
  }
  return { data, body: text.slice(m[0].length), offset: m[0].split('\n').length - 1 };
}

// Lines that count toward a size budget: no frontmatter, code blocks, HTML comments or blanks.
export function countLines(text) {
  const { body } = splitFrontmatter(text);
  let n = 0;
  let fence = false;
  let comment = false;
  for (const raw of body.split('\n')) {
    let line = raw.trim();
    if (/^(```|~~~)/.test(line)) {
      fence = !fence;
      continue;
    }
    if (fence) continue;
    if (comment) {
      if (line.includes('-->')) {
        comment = false;
        line = line.slice(line.indexOf('-->') + 3).trim();
      } else continue;
    }
    line = line.replace(/<!--[\s\S]*?-->/g, '').trim();
    if (line.includes('<!--')) {
      comment = true;
      line = line.slice(0, line.indexOf('<!--')).trim();
    }
    if (line) n++;
  }
  return n;
}

// Headings outside code blocks and comments, with 1-based line numbers.
export function headings(text) {
  const out = [];
  let fence = false;
  let comment = false;
  text.split('\n').forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (line.includes('<!--') && !line.includes('-->')) comment = true;
    else if (comment && line.includes('-->')) {
      comment = false;
      return;
    }
    if (fence || comment) return;
    const m = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (m) out.push({ level: m[1].length, title: m[2], line: i + 1 });
  });
  return out;
}

export function section(text, title) {
  const lines = text.split('\n');
  const hs = headings(text);
  const h = hs.find((x) => x.title.toLowerCase() === title.toLowerCase());
  if (!h) return null;
  const next = hs.find((x) => x.line > h.line && x.level <= h.level);
  return { start: h.line, text: lines.slice(h.line, next ? next.line - 1 : lines.length).join('\n') };
}

// `- AC-<id> …` items, with indented continuation lines folded in.
export function criteria(text) {
  const out = [];
  const lines = text.split('\n');
  let fence = false;
  let comment = false;
  let last = -2;
  lines.forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (line.includes('<!--') && !line.includes('-->')) comment = true;
    else if (comment && line.includes('-->')) {
      comment = false;
      return;
    }
    if (fence || comment) return;
    const m = line.match(/^\s*[-*]\s+(AC-[A-Za-z0-9.-]*[A-Za-z0-9])\b(.*)$/);
    if (m) {
      out.push({ id: m[1], text: m[2].trim(), line: i + 1 });
      last = i;
    } else if (out.length && i === last + 1 && /^\s{2,}\S/.test(line)) {
      out[out.length - 1].text += ` ${line.trim()}`;
      last = i;
    }
  });
  return out;
}

const FIELD_KEYS = {
  covers: 'Covers',
  expected_paths: 'Expected paths',
  outermost_test: 'Outermost test',
  depends_on: 'Depends on',
  package: 'Package',
  status: 'Status',
};
export const TASK_REQUIRED = ['covers', 'expected_paths', 'outermost_test', 'depends_on', 'package'];

export function tasks(text) {
  const out = [];
  const lines = text.split('\n');
  let cur = null;
  lines.forEach((line, i) => {
    const h = line.match(/^##\s+(T\d+)(:?)\s*(.*)$/);
    if (h) {
      cur = { id: h[1], title: h[3], heading: line.slice(3).trim(), line: i + 1, fields: {} };
      out.push(cur);
      return;
    }
    if (/^#{1,2}\s/.test(line)) cur = null;
    if (!cur) return;
    const f = line.match(/^\s*[-*]\s+([A-Za-z ]+):\s*(.*)$/);
    if (!f) return;
    const key = Object.keys(FIELD_KEYS).find((k) => FIELD_KEYS[k].toLowerCase() === f[1].trim().toLowerCase());
    if (!key) return;
    const v = f[2].trim();
    cur.fields[key] = ['covers', 'depends_on', 'expected_paths'].includes(key)
      ? v.split(/[,\s]+/).filter((x) => x && x.toLowerCase() !== 'none')
      : v;
  });
  return out;
}

export function fieldLabel(key) {
  return FIELD_KEYS[key];
}

export function openQuestions(text) {
  const s = section(text, 'Open questions');
  if (!s) return [];
  return s.text
    .split('\n')
    .map((l, i) => ({ l, line: s.start + i + 1 }))
    .filter(({ l }) => /^\s*[-*]\s+/.test(l) && !/^\s*<!--/.test(l))
    .map(({ l, line }) => ({ text: l.replace(/^\s*[-*]\s+/, ''), blocking: /^\s*[-*]\s+BLOCKING\b/.test(l), line }));
}

// `### REQ-<CAP>-<n>: title` headings inside a section (or the whole text).
export function requirementIds(text) {
  return headings(text)
    .map((h) => ({ ...h, m: h.title.match(/^(REQ-[A-Z0-9]+-\d+)\b/) }))
    .filter((h) => h.m)
    .map((h) => ({ id: h.m[1], line: h.line, title: h.title }));
}

// ADDED / MODIFIED / REMOVED parts of a delta, whatever heading level they use.
export function deltaParts(text) {
  const parts = { added: '', modified: '', removed: '' };
  let cur = null;
  for (const line of text.split('\n')) {
    const m = line.match(/^#{2,4}\s+(ADDED|MODIFIED|REMOVED)\s*$/);
    if (m) {
      cur = m[1].toLowerCase();
      continue;
    }
    if (/^#{1,6}\s/.test(line) && !/^#{1,6}\s+REQ-/.test(line)) cur = null;
    if (cur) parts[cur] += `${line}\n`;
  }
  return parts;
}
