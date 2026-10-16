// Fold a change's `changelog.md` into the project changelog's `## [Unreleased]` (REQ-VAL-9).
const ORDER = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'];

// { heading: [entry, …] }, where an entry is a `- ` line plus its indented continuation lines.
export function changelogEntries(text) {
  const out = {};
  let heading = null;
  for (const line of text.split('\n')) {
    const h = line.match(/^###\s+(.+?)\s*$/);
    if (h) heading = h[1];
    else if (/^#{1,2}\s/.test(line)) heading = null;
    else if (heading && /^[-*]\s+\S/.test(line) && !/^[-*]\s+</.test(line)) (out[heading] ??= []).push(line);
    else if (heading && /^\s+\S/.test(line) && out[heading]?.length) out[heading][out[heading].length - 1] += `\n${line}`;
  }
  return out;
}

// Returns the new changelog text, or null when there is no `## [Unreleased]` section.
export function foldChangelog(log, entries) {
  const lines = log.split('\n');
  const start = lines.findIndex((l) => /^##\s+\[Unreleased\]/i.test(l));
  if (start < 0) return null;
  let end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  if (end < 0) end = lines.length;
  const section = lines.slice(start + 1, end);
  for (const [heading, items] of Object.entries(entries)) {
    let h = section.findIndex((l) => l.trim() === `### ${heading}`);
    if (h < 0) {
      const rank = (x) => (ORDER.indexOf(x) < 0 ? ORDER.length : ORDER.indexOf(x));
      const next = section.findIndex((l) => /^###\s/.test(l) && rank(l.slice(4).trim()) > rank(heading));
      const at = next < 0 ? trimmedEnd(section) : next;
      section.splice(at, 0, ...(at > 0 && section[at - 1].trim() ? [''] : []), `### ${heading}`, ...(next < 0 ? [] : ['']));
      h = section.indexOf(`### ${heading}`, at);
    }
    let last = h + 1;
    while (last < section.length && !/^###\s/.test(section[last])) last++;
    const insertAt = trimmedEnd(section.slice(0, last));
    section.splice(Math.max(insertAt, h + 1), 0, ...items.flatMap((e) => e.split('\n')));
  }
  const body = section.slice(0, trimmedEnd(section));
  return [...lines.slice(0, start + 1), ...body, ...(end < lines.length ? ['', ...lines.slice(end)] : [''])].join('\n');
}

function trimmedEnd(arr) {
  let n = arr.length;
  while (n > 0 && !arr[n - 1].trim()) n--;
  return n;
}
