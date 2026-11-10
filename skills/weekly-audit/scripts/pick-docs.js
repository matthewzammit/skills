#!/usr/bin/env node
/**
 * Pick the docs this run re-reads in full, beside the docs the week changed. A doc no change touches is never
 * checked by the docs freshness check, so a few of them get a turn each run, the longest unread first.
 *
 *   node pick-docs.js --records <folder> --range <start>..<end> [--count <n>] [--docs <folder or file>]...
 *
 * - Docs: the tracked Markdown files under each --docs (default: the whole repo), less the records folder.
 * - Re-read: the "Docs re-read:" line of each past record (<records>/YYYY-MM-DD*.md). A doc's last commit is not a
 *   re-read: a one-line edit is not a review.
 * - Order: docs never re-read first, oldest last commit first; then the ones re-read longest ago.
 * - Docs the range changed are left out: the normal docs check reads them.
 * - Count: --count, else about every doc in 16 runs: max(3, ceil(docs / 16)). A fixed 3 a run never finished a round.
 * Run it from the repo root. It only reads.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const LINE = /^Docs re-read:\s*(.*)$/m;

/** The docs named on a record's "Docs re-read:" line ("none" or an empty line gives none). */
function reReadLine(text) {
  const m = String(text).match(LINE);
  if (!m) return [];
  return m[1]
    .split(',')
    .map((s) => s.replace(/[`*]/g, '').replace(/\(.*\)$/, '').trim())
    .filter((s) => s && s.toLowerCase() !== 'none');
}

/** Pure: order the candidates and take `count`. Dates are ISO strings, so they sort as text. */
/** The default count: every doc re-read in about 16 runs, and never fewer than 3 a run. */
const defaultCount = (docCount) => Math.max(3, Math.ceil(docCount / 16));

function pickDocs({ docs, changed = [], reReads = new Map(), lastCommit = new Map(), count = 3 }) {
  const skip = new Set(changed);
  const commit = (d) => lastCommit.get(d) ?? '';
  return docs
    .filter((d) => !skip.has(d))
    .sort((a, b) => {
      const ra = reReads.get(a) ?? '';
      const rb = reReads.get(b) ?? '';
      if (ra !== rb) return ra < rb ? -1 : 1; // never re-read ('') sorts first
      if (commit(a) !== commit(b)) return commit(a) < commit(b) ? -1 : 1;
      return a < b ? -1 : 1;
    })
    .slice(0, count);
}

/** Each doc's newest re-read date, from the records' file names (YYYY-MM-DD) and their re-read lines. */
function readRecords(folder) {
  const out = new Map();
  if (!folder || !fs.existsSync(folder)) return out;
  for (const name of fs.readdirSync(folder).filter((n) => /^\d{4}-\d{2}-\d{2}.*\.md$/.test(n)).sort()) {
    const date = name.slice(0, 10);
    for (const doc of reReadLine(fs.readFileSync(path.join(folder, name), 'utf8'))) out.set(doc, date);
  }
  return out;
}

/**
 * History, not docs to follow: any path with a folder named archive, _archive or archived. An archived plan or record
 * says what was true on its day, so its facts are not checked and it is not re-read. Point --docs at other record
 * folders (plans, past audits) to leave them out too.
 */
const isArchived = (f) => f.split('/').some((seg) => /^_?archived?$/i.test(seg));

const git = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

/** Each file's last commit date, from one pass over the log. */
function lastCommits() {
  const out = new Map();
  let date = null;
  for (const line of git(['log', '--format=@%cI', '--name-only']).split('\n')) {
    if (line.startsWith('@')) date = line.slice(1);
    else if (line && !out.has(line)) out.set(line, date);
  }
  return out;
}

function main(argv) {
  const args = { docs: [], count: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--records') args.records = argv[++i];
    else if (a === '--range') args.range = argv[++i];
    else if (a === '--count') args.count = Number(argv[++i]);
    else if (a === '--docs') args.docs.push(argv[++i]);
    else throw new Error(`Unknown option ${a}`);
  }
  if (!args.records) throw new Error('--records <folder> is required.');
  if (args.count !== null && (!Number.isInteger(args.count) || args.count < 0)) throw new Error('--count needs a whole number.');
  const records = path.normalize(args.records).replace(/\/$/, '');
  const docs = git(['ls-files', '--', ...(args.docs.length ? args.docs : ['.'])])
    .split('\n')
    .filter((f) => /\.mdx?$/i.test(f) && !isArchived(f) && !f.startsWith(`${records}/`));
  const changed = args.range ? git(['diff', '--name-only', args.range]).split('\n').filter(Boolean) : [];
  const count = args.count ?? defaultCount(docs.length);
  const runs = count > 0 ? Math.ceil(docs.length / count) : 0;
  console.log(`${docs.length} docs, ${count} a run${args.count === null ? ' (default)' : ''}: a full round takes about ${runs} runs.`);
  const reReads = readRecords(args.records);
  const lastCommit = lastCommits();
  for (const d of pickDocs({ docs, changed, reReads, lastCommit, count })) {
    console.log(`${d}\t${reReads.has(d) ? `re-read ${reReads.get(d)}` : 'never re-read'}\tlast commit ${(lastCommit.get(d) ?? '?').slice(0, 10)}`);
  }
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

module.exports = { isArchived, pickDocs, defaultCount, reReadLine, readRecords };
