// Minimal POSIX-ish shell parser for the guard hook. It does not execute or expand anything:
// it splits a command line into simple commands (argv + redirects), keeping quoted text and
// heredoc bodies as data, and parsing command substitutions as nested command lists.

export class ParseError extends Error {}

const OPERATORS = ['&&', '||', ';;', '|&', ';', '|', '&'];
const WORD_END = new Set([' ', '\t', '\n', ';', '&', '|', '<', '>', '(', ')']);
const RESERVED = new Set(['if', 'then', 'else', 'elif', 'fi', 'do', 'done', 'while', 'until', '!', '{', '}', 'time']);

/**
 * Parses `src` into `{ commands: Command[] }` where
 * Command = { argv: string[], redirects: {op, target}[], heredocs: {body, quoted}[], subs: Parsed[] }.
 * Throws ParseError on unterminated quotes or substitutions.
 */
export function parse(src) {
  const p = new Parser(src);
  const result = p.list(false);
  return result;
}

class Parser {
  constructor(src) {
    this.src = src;
    this.i = 0;
    this.pending = []; // heredocs waiting for the next newline
  }

  list(inSubst) {
    const commands = [];
    let cmd = newCommand();
    let depth = 0;
    const flush = () => {
      while (cmd.argv.length && RESERVED.has(cmd.argv[0])) cmd.argv.shift();
      if (cmd.argv.length || cmd.redirects.length) commands.push(cmd);
      cmd = newCommand();
    };
    const { src } = this;
    for (;;) {
      while (src[this.i] === ' ' || src[this.i] === '\t') this.i++;
      if (this.i >= src.length) {
        if (inSubst) throw new ParseError('unterminated command substitution');
        if (this.pending.length) this.readHeredocs();
        flush();
        return { commands };
      }
      const ch = src[this.i];
      if (ch === '\\' && src[this.i + 1] === '\n') {
        this.i += 2;
        continue;
      }
      if (ch === '\n') {
        this.i++;
        flush();
        this.readHeredocs();
        continue;
      }
      if (ch === '#' ) {
        while (this.i < src.length && src[this.i] !== '\n') this.i++;
        continue;
      }
      if (ch === ')') {
        this.i++;
        if (depth > 0) {
          depth--;
          flush();
          continue;
        }
        if (inSubst) {
          flush();
          return { commands };
        }
        throw new ParseError('unbalanced )');
      }
      if (ch === '(' ) {
        this.i++;
        depth++;
        flush();
        continue;
      }
      const redir = this.matchRedirect();
      if (redir) {
        this.addRedirect(cmd, redir);
        continue;
      }
      const op = OPERATORS.find((o) => src.startsWith(o, this.i));
      if (op) {
        this.i += op.length;
        flush();
        continue;
      }
      if ((ch === '<' || ch === '>') && src[this.i + 1] === '(') {
        // process substitution
        this.i += 2;
        cmd.subs.push(this.list(true));
        continue;
      }
      const word = this.word();
      cmd.subs.push(...word.subs);
      cmd.argv.push(word.value);
    }
  }

  matchRedirect() {
    const m = /^(\d*|&)(>>|>\||>&|&>>|<<<|<<-|<<|<&|<>|>|<)/.exec(this.src.slice(this.i, this.i + 8));
    if (!m) return null;
    if (/^[<>]\($/.test(this.src.slice(this.i, this.i + 2))) return null;
    if (m[1] === '&' && !m[2].startsWith('>')) return null;
    return m;
  }

  addRedirect(cmd, m) {
    this.i += m[0].length;
    const op = (m[1] === '&' ? '&' : '') + m[2];
    while (this.src[this.i] === ' ' || this.src[this.i] === '\t') this.i++;
    if (this.i >= this.src.length || WORD_END.has(this.src[this.i])) throw new ParseError(`missing redirect target after ${op}`);
    const start = this.i;
    const w = this.word();
    cmd.subs.push(...w.subs);
    if (op === '<<' || op === '<<-') {
      const raw = this.src.slice(start, this.i);
      const heredoc = { body: '', quoted: /['"\\]/.test(raw), delim: w.value, strip: op === '<<-' };
      cmd.heredocs.push(heredoc);
      this.pending.push(heredoc);
      return;
    }
    cmd.redirects.push({ op, target: w.value });
  }

  readHeredocs() {
    const { src } = this;
    for (const h of this.pending) {
      const lines = [];
      for (;;) {
        if (this.i >= src.length) break; // bash reads to EOF with a warning
        let end = src.indexOf('\n', this.i);
        if (end === -1) end = src.length;
        let line = src.slice(this.i, end);
        this.i = Math.min(end + 1, src.length);
        if (h.strip) line = line.replace(/^\t+/, '');
        if (line === h.delim) break;
        lines.push(line);
      }
      h.body = lines.join('\n');
    }
    this.pending = [];
  }

  word() {
    const { src } = this;
    let value = '';
    const subs = [];
    while (this.i < src.length) {
      const ch = src[this.i];
      if (WORD_END.has(ch)) break;
      if (ch === '\\') {
        if (src[this.i + 1] === '\n') {
          this.i += 2;
          continue;
        }
        value += src[this.i + 1] ?? '';
        this.i += 2;
        continue;
      }
      if (ch === "'") {
        const end = src.indexOf("'", this.i + 1);
        if (end === -1) throw new ParseError('unterminated single quote');
        value += src.slice(this.i + 1, end);
        this.i = end + 1;
        continue;
      }
      if (ch === '$' && src[this.i + 1] === "'") {
        this.i += 2;
        while (this.i < src.length && src[this.i] !== "'") {
          if (src[this.i] === '\\') this.i++;
          value += src[this.i] ?? '';
          this.i++;
        }
        if (this.i >= src.length) throw new ParseError('unterminated $\' quote');
        this.i++;
        continue;
      }
      if (ch === '"') {
        this.i++;
        value += this.doubleQuoted(subs);
        continue;
      }
      if (ch === '$' || ch === '`') {
        value += this.dollar(subs);
        continue;
      }
      value += ch;
      this.i++;
    }
    return { value, subs };
  }

  doubleQuoted(subs) {
    const { src } = this;
    let value = '';
    for (;;) {
      if (this.i >= src.length) throw new ParseError('unterminated double quote');
      const ch = src[this.i];
      if (ch === '"') {
        this.i++;
        return value;
      }
      if (ch === '\\') {
        const next = src[this.i + 1];
        if (next === '\n') {
          this.i += 2;
          continue;
        }
        if ('$`"\\'.includes(next)) {
          value += next;
          this.i += 2;
          continue;
        }
        value += ch;
        this.i++;
        continue;
      }
      if (ch === '$' || ch === '`') {
        value += this.dollar(subs);
        continue;
      }
      value += ch;
      this.i++;
    }
  }

  // Handles `$(...)`, `$((...))`, `${...}`, backticks and plain `$`. Returns the raw text so
  // that argument values still contain e.g. heredoc bodies passed through `$(cat <<EOF ...)`.
  dollar(subs) {
    const { src } = this;
    const start = this.i;
    if (src[this.i] === '`') {
      let j = this.i + 1;
      let inner = '';
      while (j < src.length && src[j] !== '`') {
        if (src[j] === '\\' && j + 1 < src.length) {
          inner += src[j + 1];
          j += 2;
          continue;
        }
        inner += src[j];
        j++;
      }
      if (j >= src.length) throw new ParseError('unterminated backtick');
      this.i = j + 1;
      subs.push(parse(inner));
      return src.slice(start, this.i);
    }
    if (src.startsWith('$((', this.i)) {
      this.i = this.matching(this.i + 3, '(', ')', 2);
      return src.slice(start, this.i);
    }
    if (src.startsWith('$(', this.i)) {
      this.i += 2;
      const saved = this.pending;
      this.pending = [];
      subs.push(this.list(true));
      this.pending = saved;
      return src.slice(start, this.i);
    }
    if (src.startsWith('${', this.i)) {
      this.i = this.matching(this.i + 2, '{', '}', 1);
      return src.slice(start, this.i);
    }
    this.i++;
    return '$';
  }

  matching(from, open, close, closers) {
    const { src } = this;
    let depth = closers;
    let j = from;
    while (j < src.length) {
      if (src[j] === '\\') j++;
      else if (src[j] === open) depth++;
      else if (src[j] === close) {
        depth--;
        if (depth === 0) return j + 1;
      }
      j++;
    }
    throw new ParseError(`unterminated ${open}`);
  }
}

function newCommand() {
  return { argv: [], redirects: [], heredocs: [], subs: [] };
}

/** Short-option cluster parse: returns the set of letters in `-abc`, stopping at one that takes a value. */
export function shortFlags(arg, takesValue = '') {
  const out = new Set();
  if (!/^-[A-Za-z0-9]/.test(arg)) return out;
  for (const c of arg.slice(1)) {
    out.add(c);
    if (takesValue.includes(c)) break;
  }
  return out;
}

export function basename(p) {
  const s = p.split('/');
  return s[s.length - 1];
}
