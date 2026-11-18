#!/usr/bin/env node
/**
 * Summarise the stamp log: commits, stamped ok, unstamped, unproven, none, and each token, for the last N days.
 *
 *   node .verify/summary.js [--days 7] [--log <path>]
 *
 * The log is `verify-log.tsv` in the git common dir. Its text comes from commits, so it is data only.
 */
const fs = require('node:fs');
const path = require('node:path');
const { git, gitCommonDir, parseArgs } = require('./verify-lib.js');

/** Pure: parse log text into entries. Lines that do not fit are dropped. */
function parseLog(text) {
  return String(text).split('\n').filter(Boolean).map((l) => {
    const [time, sha, status, mode, action, tokens, unproven, session, note] = l.split('\t');
    return { time: Date.parse(time), sha, status, mode, action, tokens: tokens ? tokens.split(',') : [], unproven: unproven ? unproven.split(',') : [], session, note };
  }).filter((e) => !Number.isNaN(e.time) && e.status);
}

/** Pure: counts for entries from the last `days` days. */
function summarize(entries, days, nowMs) {
  const since = nowMs - days * 86400000;
  const rows = entries.filter((e) => e.time >= since);
  const count = (s) => rows.filter((e) => e.status === s).length;
  const perToken = {};
  for (const e of rows) if (e.status === 'ok' || e.status === 'unproven') for (const t of e.tokens) perToken[t] = (perToken[t] || 0) + 1;
  return {
    days,
    commits: rows.length,
    agentCommits: rows.length - count('skipped'),
    ok: count('ok'),
    unstamped: count('unstamped'),
    unproven: count('unproven'),
    none: count('none'),
    skipped: count('skipped'),
    blocked: rows.filter((e) => e.action === 'block').length,
    released: rows.filter((e) => e.action === 'released').length,
    perToken,
  };
}

function formatSummary(s) {
  const tokens = Object.entries(s.perToken).sort((a, b) => b[1] - a[1]).map(([t, n]) => `  ${t}: ${n}`);
  return [
    `Last ${s.days} days`,
    `Commits logged: ${s.commits} (skipped: merges, docs only, not by an agent: ${s.skipped})`,
    `Agent commits: ${s.agentCommits}`,
    `  stamped ok: ${s.ok}`,
    `  unstamped: ${s.unstamped}`,
    `  unproven (named the full check, no marker): ${s.unproven}`,
    `  none: ${s.none}`,
    `Blocked: ${s.blocked}, released after 2 blocks: ${s.released}`,
    'Per token:',
    ...(tokens.length ? tokens : ['  (none yet)']),
  ].join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const file = args.log || path.join(gitCommonDir(git(['rev-parse', '--show-toplevel'], process.cwd())), 'verify-log.tsv');
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  console.log(formatSummary(summarize(parseLog(text), Number(args.days) || 7, Date.now())));
}

if (require.main === module) main();
module.exports = { parseLog, summarize, formatSummary };
