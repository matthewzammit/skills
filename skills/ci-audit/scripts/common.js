/**
 * Shared helpers for the ci-audit scripts: arguments, the audit window, the config, simple statistics, and a
 * small YAML reader that is enough for GitHub workflow files. Node 18 or newer, no dependencies.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/** `--key value` and `--flag` pairs into an object. A key given twice becomes an array. */
function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const key = a.slice(2);
    // zsh does not split an unquoted $VAR, so `node x.js $ARGS` arrives as one argument and the options vanish.
    if (/\s/.test(key)) throw new Error(`one option per argument, got "${a.slice(0, 60)}" (in zsh, put the options in an array)`);
    const next = argv[i + 1];
    const value = next === undefined || next.startsWith('--') ? true : (i++, next);
    if (key in out) out[key] = [].concat(out[key], value);
    else out[key] = value;
  }
  return out;
}

const pad = (n) => String(n).padStart(2, '0');
/** A Date as a local YYYY-MM-DD. */
const localDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Local midnight of a YYYY-MM-DD. */
function parseDay(s) {
  const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(String(s));
  if (!m) throw new Error(`not a date (YYYY-MM-DD): ${s}`);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/**
 * The audit window in local time, start inclusive, end exclusive.
 * Default: last week, Monday 00:00 to Monday 00:00. `--days N`: the N days before today. `--from`/`--to`: any dates
 * (`--to` is the day after the last day, like the Monday that ends a week).
 */
function windowFrom(args, now = new Date()) {
  let start;
  let end;
  if (args.from || args.to) {
    if (!args.from || !args.to) throw new Error('give both --from and --to (YYYY-MM-DD, --to is exclusive)');
    start = parseDay(args.from);
    end = parseDay(args.to);
  } else if (args.days) {
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start = new Date(end);
    start.setDate(end.getDate() - Number(args.days));
  } else {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sinceMonday = (today.getDay() + 6) % 7;
    end = new Date(today);
    end.setDate(today.getDate() - sinceMonday);
    start = new Date(end);
    start.setDate(end.getDate() - 7);
  }
  if (!(end > start)) throw new Error('the window ends before it starts');
  return { start, end, from: localDay(start), to: localDay(end), startIso: start.toISOString(), endIso: end.toISOString() };
}

/** Milliseconds since the epoch for an ISO timestamp, or null. */
const ms = (s) => (s ? Date.parse(s) : null);

function median(xs) {
  const v = xs.filter((x) => typeof x === 'number' && !Number.isNaN(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return round(v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2, 1);
}
/** The value at the 90th percentile (nearest rank, the same rule as the original audit). */
function p90(xs) {
  const v = xs.filter((x) => typeof x === 'number' && !Number.isNaN(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  return round(v[Math.min(v.length - 1, Math.floor(0.9 * v.length))], 1);
}
const round = (x, d = 1) => (x === null || x === undefined ? null : Math.round(x * 10 ** d) / 10 ** d);
const sum = (xs) => xs.reduce((a, b) => a + (b || 0), 0);
function countBy(xs, fn) {
  const out = {};
  for (const x of xs) {
    const k = fn(x);
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

/** Run a command and return its stdout, or throw with its stderr. */
function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'], ...opts });
}

function repoRoot(cwd = process.cwd()) {
  try { return run('git', ['rev-parse', '--show-toplevel'], { cwd }).trim(); } catch { return null; }
}

/** The repo name in a remote URL (`git@github.com:o/name.git`, `https://github.com/o/name`), or null. */
function repoNameFromUrl(url) {
  const m = /([^/:]+?)(\.git)?\/?$/.exec(String(url || '').trim());
  return m ? m[1] : null;
}

/**
 * The repo's ci-audit config, or {}. Looks at --config, then `.ci-audit/config.json` in the repo, then
 * `~/.claude/ci-audit/<repo name on the remote>/config.json`, then the same under the repo's folder name. The remote
 * name comes first because worktree layouts often name the main checkout `main`.
 * Regex fields stay strings here; each script compiles its own.
 */
function loadConfig(args = {}, cwd = process.cwd()) {
  const root = repoRoot(cwd) || cwd;
  let remote = null;
  try { remote = repoNameFromUrl(run('git', ['remote', 'get-url', 'origin'], { cwd: root })); } catch { /* no remote */ }
  const home = (name) => path.join(os.homedir(), '.claude', 'ci-audit', name, 'config.json');
  const candidates = args.config ? [path.resolve(String(args.config))] : [
    path.join(root, '.ci-audit', 'config.json'),
    ...(remote ? [home(remote)] : []),
    home(path.basename(commonRepoDir(root) || root)),
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) return { ...JSON.parse(fs.readFileSync(file, 'utf8')), _file: file };
  }
  if (args.config) throw new Error(`no config at ${args.config}`);
  return {};
}

/** The main checkout of a repo with worktrees (the folder that holds the shared .git), or the root itself. */
function commonRepoDir(root) {
  try {
    const common = run('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: root }).trim();
    return path.basename(common) === '.git' ? path.dirname(common) : root;
  } catch { return root; }
}

/**
 * A small YAML reader for workflow files: block mappings, block lists (of scalars or mappings), inline [a, b]
 * lists, quoted strings and comments. Block scalars (| and >) are kept as one string. Anchors, aliases and
 * multi-document files are not supported; a workflow rarely uses them.
 */
function parseYaml(text) {
  const lines = [];
  for (const raw of text.replace(/\t/g, '  ').split('\n')) {
    const stripped = stripComment(raw);
    if (!stripped.trim()) { lines.push(null); continue; }
    lines.push({ indent: raw.length - raw.trimStart().length, text: stripped.trim(), raw });
  }
  let i = 0;
  const next = () => { while (i < lines.length && lines[i] === null) i++; return lines[i]; };

  function scalar(s) {
    s = s.trim();
    if (s === '' || s === '~' || s === 'null') return null;
    if (/^(true|false)$/.test(s)) return s === 'true';
    if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
    if (s.startsWith('[') && s.endsWith(']')) {
      const inner = s.slice(1, -1).trim();
      return inner ? splitTop(inner).map(scalar) : [];
    }
    if (s.startsWith('{') && s.endsWith('}')) {
      const obj = {};
      for (const part of splitTop(s.slice(1, -1))) {
        const k = part.indexOf(':');
        if (k > 0) obj[part.slice(0, k).trim()] = scalar(part.slice(k + 1));
      }
      return obj;
    }
    return s;
  }

  function blockScalar(parentIndent) {
    const out = [];
    while (i < lines.length) {
      const l = lines[i];
      if (l === null) { out.push(''); i++; continue; }
      if (l.indent <= parentIndent) break;
      out.push(l.raw.trim());
      i++;
    }
    return out.join('\n').trim();
  }

  function block(indent) {
    const first = next();
    if (!first || first.indent < indent) return null;
    if (first.text.startsWith('- ') || first.text === '-') return list(first.indent);
    return map(first.indent);
  }

  function value(rest, ownIndent) {
    if (rest === '|' || rest === '>' || /^[|>][+-]?$/.test(rest)) return blockScalar(ownIndent);
    if (rest !== '') return scalar(rest);
    const n = next();
    if (!n || n.indent < ownIndent) return null;
    if (n.indent === ownIndent && !n.text.startsWith('-')) return null;
    return block(n.indent);
  }

  function map(indent) {
    const obj = {};
    for (let l = next(); l && l.indent === indent && !l.text.startsWith('- '); l = next()) {
      const k = keyOf(l.text);
      if (k === null) { i++; continue; }
      i++;
      obj[k.key] = value(k.rest, indent);
    }
    return obj;
  }

  function list(indent) {
    const arr = [];
    for (let l = next(); l && l.indent === indent && (l.text.startsWith('- ') || l.text === '-'); l = next()) {
      const body = l.text === '-' ? '' : l.text.slice(2);
      const k = keyOf(body);
      if (k && !/^["']/.test(body)) {
        // A mapping that starts on the dash line: re-read it as a map at the column after "- ".
        const col = l.indent + 2;
        lines[i] = { indent: col, text: body, raw: ' '.repeat(col) + body };
        arr.push(map(col));
      } else {
        i++;
        arr.push(body === '' ? block(indent + 1) : scalar(body));
      }
    }
    return arr;
  }

  return block(0) || {};
}

function keyOf(text) {
  const m = /^("[^"]*"|'[^']*'|[^\s:][^:]*?):(?:\s+(.*)|$)/.exec(text);
  if (!m) return null;
  return { key: m[1].replace(/^["']|["']$/g, ''), rest: (m[2] || '').trim() };
}

function stripComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === '#' && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i).trimEnd();
  }
  return line.trimEnd();
}

/** Split "a, b, [c, d]" at top-level commas. */
function splitTop(s) {
  const out = [];
  let depth = 0;
  let quote = null;
  let cur = '';
  for (const c of s) {
    if (quote) { cur += c; if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") quote = c;
    if (c === '[' || c === '{') depth++;
    if (c === ']' || c === '}') depth--;
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** A GitHub path filter glob as a RegExp (`**` any depth, `*` one segment, `?` one character). */
function globToRegex(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      re += '.*';
      i++;
      if (glob[i + 1] === '/') i++;
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

/** Mask anything that looks like a secret before it is stored or printed. */
function redact(s) {
  if (!s) return s;
  return String(s)
    .replace(/\b(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|xox[abpr]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|pk_[A-Za-z0-9_]{20,})\b/g, '<secret>')
    .replace(/((?:authorization|x-api-key|api[_-]?key|token|password|secret)["']?\s*[:=]\s*["']?)(?:bearer\s+)?[^\s"'&]{8,}/gi, '$1<secret>')
    .replace(/(bearer\s+)[A-Za-z0-9._~+/-]{12,}=*/gi, '$1<secret>');
}

module.exports = {
  parseArgs, windowFrom, parseDay, localDay, ms, median, p90, round, sum, countBy, run, repoRoot, commonRepoDir,
  loadConfig, repoNameFromUrl, parseYaml, globToRegex, redact,
};
