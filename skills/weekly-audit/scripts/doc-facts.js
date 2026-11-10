#!/usr/bin/env node
/**
 * Check the facts in the repo's Markdown that a script can prove, so the weekly audit does not spend a re-read on them.
 *
 *   node doc-facts.js [--docs <folder or file>]... [--exclude <folder>]...
 *
 * Over the tracked Markdown files (default: all of them) it reports:
 * - a relative link whose file does not exist, or whose #anchor matches no heading;
 * - a backticked repo path (it has a "/" and starts with a top-level tracked folder) that does not exist;
 * - `npm run <name>`, `pnpm run <name>` or `yarn <name>` where package.json has no such script.
 *
 * Links and paths inside code fences are skipped; commands inside fences are checked. A line that reads as history
 * ("was removed", "renamed", "no longer") and a line with `doc-check-ignore` are skipped.
 * Output is `file:line  what`, then a count. Run it from the repo root. It only reads, and it always exits 0:
 * it is an audit aid, not a gate.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const HISTORY = /\b(removed|deleted|retired|renamed|replaced|dropped|superseded|deprecated|was|were|used to|no longer|until|formerly|previously|moved)\b/i;
const IGNORE = 'doc-check-ignore';
const YARN_BUILTINS = new Set(['add', 'audit', 'build', 'cache', 'config', 'create', 'dlx', 'dev', 'exec', 'global', 'help', 'info', 'init', 'install', 'link', 'list', 'login', 'logout', 'outdated', 'pack', 'publish', 'remove', 'run', 'set', 'start', 'test', 'unlink', 'up', 'upgrade', 'version', 'why', 'workspace', 'workspaces']);

const isHistory = (line) => HISTORY.test(line) || line.includes(IGNORE);

/** The lines of a doc with their number and whether they sit inside a fenced code block (fence lines count as fenced). */
function lines(text) {
  const out = [];
  let fence = null;
  text.split('\n').forEach((raw, i) => {
    const open = raw.match(/^\s*(```+|~~~+)/);
    if (open && fence === null) {
      fence = open[1];
      out.push({ n: i + 1, text: raw, fenced: true });
    } else if (fence !== null && raw.trim().startsWith(fence)) {
      fence = null;
      out.push({ n: i + 1, text: raw, fenced: true });
    } else {
      out.push({ n: i + 1, text: raw, fenced: fence !== null });
    }
  });
  return out;
}

/** GitHub's heading slug: lower case, punctuation dropped (hyphens and underscores kept), spaces to hyphens. */
function slug(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

/** Every anchor a doc offers: one per heading (repeats get -1, -2, ...), plus explicit `<a name>` and `id=` anchors. */
function anchors(text) {
  const seen = new Map();
  const out = new Set();
  for (const l of lines(text)) {
    if (l.fenced) continue;
    const h = l.text.match(/^#{1,6}\s+(.*?)\s*#*\s*$/);
    if (h) {
      const base = slug(h[1]);
      const count = seen.get(base) ?? 0;
      out.add(count === 0 ? base : `${base}-${count}`);
      seen.set(base, count + 1);
    }
    for (const m of l.text.matchAll(/<a\s+(?:name|id)="([^"]+)"/g)) out.add(m[1]);
  }
  return out;
}

/** The relative links outside code fences and inline code. `target` is '' for a link to a heading in the same file. */
function links(text) {
  const out = [];
  for (const l of lines(text)) {
    if (l.fenced || isHistory(l.text)) continue;
    const body = l.text.replace(/`[^`]*`/g, '');
    for (const m of body.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) {
      const raw = m[1];
      if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith('//')) continue; // http:, mailto:, app schemes
      const hash = raw.indexOf('#');
      const target = hash === -1 ? raw : raw.slice(0, hash);
      let decoded = target;
      try {
        decoded = decodeURI(target);
      } catch {
        // keep the raw target
      }
      out.push({ line: l.n, target: decoded, anchor: hash === -1 ? null : raw.slice(hash + 1) });
    }
  }
  return out;
}

/** Backticked repo paths outside code fences: a "/" in them, and a first segment that is one of `roots`. */
function pathRefs(text, roots) {
  const set = new Set(roots);
  const out = [];
  for (const l of lines(text)) {
    if (l.fenced || isHistory(l.text)) continue;
    for (const m of l.text.matchAll(/`([^`\s]+)`/g)) {
      const v = m[1].replace(/[),.;:]+$/, '').replace(/:\d+(-\d+)?(,\d+)*$/, '').replace(/#.*$/, '');
      if (!v.includes('/') || /[*<>{}$|]|\.\.\.|^\.\.?\/|YYYY|NNN/.test(v) || /^[a-z][a-z0-9+.-]*:/i.test(v)) continue;
      if (set.has(v.split('/')[0])) out.push({ line: l.n, value: v.replace(/\/$/, '') });
    }
  }
  return out;
}

/** `npm run x`, `pnpm run x` and `yarn x` anywhere, fences included. Skips `x:*` families and placeholders. */
function scriptRefs(text) {
  const out = [];
  for (const l of lines(text)) {
    if (isHistory(l.text)) continue;
    for (const m of l.text.matchAll(/\b(?:npm|pnpm)\s+run\s+([A-Za-z0-9_:.@/*-]+)|\byarn\s+(?!run\b)([A-Za-z0-9_:.@/*-]+)/g)) {
      const name = m[1] ?? m[2];
      if (name.includes('*') || name.startsWith('-')) continue;
      if (m[2] && (YARN_BUILTINS.has(name) || /^[./@]/.test(name))) continue;
      out.push({ line: l.n, name: name.replace(/[.,;:]+$/, '') });
    }
    for (const m of l.text.matchAll(/\byarn\s+run\s+([A-Za-z0-9_:.@/*-]+)/g)) {
      if (!m[1].includes('*') && !m[1].startsWith('-')) out.push({ line: l.n, name: m[1].replace(/[.,;:]+$/, '') });
    }
  }
  return out;
}

/**
 * Pure: the problems in one doc.
 * ctx: { file, text, exists(repoPath), readDoc(repoPath), roots, scripts (Set or null) }
 * Returns [{ file, line, what }].
 */
function checkDoc({ file, text, exists, readDoc, roots, scripts }) {
  const problems = [];
  const add = (line, what) => problems.push({ file, line, what });
  const dir = path.posix.dirname(file);
  const own = anchors(text);
  for (const l of links(text)) {
    if (l.target === '') {
      if (l.anchor && !own.has(l.anchor)) add(l.line, `anchor #${l.anchor} matches no heading here`);
      continue;
    }
    const resolved = l.target.startsWith('/') ? l.target.slice(1) : path.posix.normalize(path.posix.join(dir, l.target));
    if (!exists(resolved)) {
      add(l.line, `link target ${l.target} does not exist`);
    } else if (l.anchor && /\.mdx?$/i.test(resolved)) {
      const other = readDoc(resolved);
      if (other !== null && !anchors(other).has(l.anchor)) add(l.line, `anchor #${l.anchor} matches no heading in ${resolved}`);
    }
  }
  for (const r of pathRefs(text, roots)) {
    if (!exists(r.value)) add(r.line, `path \`${r.value}\` does not exist`);
  }
  if (scripts) {
    for (const r of scriptRefs(text)) {
      if (!scripts.has(r.name)) add(r.line, `package.json has no script "${r.name}"`);
    }
  }
  return problems;
}

/**
 * History, not docs to follow: any path with a folder named archive, _archive or archived. An archived plan or record
 * says what was true on its day, so its facts are not checked and it is not re-read. Point --docs at other record
 * folders (plans, past audits) to leave them out too.
 */
const isArchived = (f) => f.split('/').some((seg) => /^_?archived?$/i.test(seg));

const git = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

function main(argv) {
  const docsArgs = [];
  const exclude = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--docs') docsArgs.push(argv[++i]);
    else if (a === '--exclude') exclude.push(path.normalize(argv[++i]).replace(/\/$/, ''));
    else throw new Error(`Unknown option ${a}`);
  }
  const tracked = git(['ls-files']).split('\n').filter(Boolean);
  const roots = [...new Set(tracked.filter((f) => f.includes('/')).map((f) => f.split('/')[0]))];
  const listed = git(['ls-files', '--', ...(docsArgs.length ? docsArgs : ['.'])]).split('\n');
  const docs = listed.filter(
    (f) => /\.mdx?$/i.test(f) && !isArchived(f) && !exclude.some((e) => f === e || f.startsWith(`${e}/`)),
  );
  let scripts = null;
  if (fs.existsSync('package.json')) {
    try {
      scripts = new Set(Object.keys(JSON.parse(fs.readFileSync('package.json', 'utf8')).scripts ?? {}));
    } catch {
      scripts = null;
    }
  }
  const exists = (p) => fs.existsSync(p);
  const readDoc = (p) => (fs.existsSync(p) && fs.statSync(p).isFile() ? fs.readFileSync(p, 'utf8') : null);
  let count = 0;
  for (const file of docs) {
    if (!fs.existsSync(file)) continue;
    for (const p of checkDoc({ file, text: fs.readFileSync(file, 'utf8'), exists, readDoc, roots, scripts })) {
      console.log(`${p.file}:${p.line}  ${p.what}`);
      count += 1;
    }
  }
  console.log(`${count} problem${count === 1 ? '' : 's'} in ${docs.length} docs.`);
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
  }
}

module.exports = { slug, anchors, links, pathRefs, scriptRefs, checkDoc, isHistory };
