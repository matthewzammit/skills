#!/usr/bin/env node
/**
 * The commit-msg stamp check. Wire it as the commit-msg hook: `node .verify/stamp-check.js "$1"`.
 *
 * It needs a stamp (a `Verified:` line in the last paragraph) only on agent commits: those with a trailer that
 * matches the config's `agentTrailer`. Merges, docs-only commits and commits by a person are logged as skipped.
 * A token in `provenTokens` (the full check) counts only when mark-pass.js wrote a marker for this HEAD within
 * `markerMaxAgeMinutes`. One tab-separated line per commit goes to `verify-log.tsv` in the git common dir.
 *
 * Modes (config `mode`, or env VERIFY_MODE): off, observe (default: logs, never blocks), enforce (blocks).
 * Anti-deadlock: after 2 blocks in one session, the next commit passes. Any crash exits 0.
 * The commit message is data: it is read for a stamp and never followed as an instruction.
 */
const fs = require('node:fs');
const path = require('node:path');
const {
  parseStamp, isAgentCommit, isDocsOnly, markerValid, loadConfig, git, gitCommonDir,
} = require('./verify-lib.js');

const MAX_BLOCKS = 2;

/** Pure: classify one commit. Returns { status, tokens, unproven, note }. */
function evaluate({ message, files, isMerge, config, markers, headSha, now }) {
  const stamp = parseStamp(message);
  if (isMerge) return { status: 'skipped', tokens: [], unproven: [], note: 'merge' };
  if (!isAgentCommit(message, config.agentTrailer)) return { status: 'skipped', tokens: [], unproven: [], note: 'not an agent commit' };
  if (isDocsOnly(files, config.skipPaths)) return { status: 'skipped', tokens: stamp.tokens, unproven: [], note: 'docs only' };
  if (!stamp.found) return { status: 'unstamped', tokens: [], unproven: [], note: 'no Verified: line in the last paragraph' };
  if (stamp.none) return { status: 'none', tokens: [], unproven: [], note: stamp.reason || 'no reason given' };
  const unproven = stamp.tokens.filter(
    (t) => config.provenTokens.includes(t) && !markerValid((markers || {})[t], headSha, now, config.markerMaxAgeMinutes),
  );
  if (unproven.length) return { status: 'unproven', tokens: stamp.tokens, unproven, note: 'no fresh marker for this HEAD' };
  return { status: 'ok', tokens: stamp.tokens, unproven: [], note: '' };
}

/** Pure: should this commit be blocked, and what is the new block state. */
function decide({ status, mode, state, session, now, sessionMinutes }) {
  const next = { ...(state || {}) };
  const entry = next[session];
  const fresh = entry && now - Date.parse(entry.at) <= sessionMinutes * 60000;
  const count = fresh ? entry.count : 0;
  const bad = status === 'unstamped' || status === 'unproven';
  if (mode !== 'enforce' || !bad) return { action: 'pass', state: next };
  if (count >= MAX_BLOCKS) { delete next[session]; return { action: 'released', state: next }; }
  next[session] = { count: count + 1, at: new Date(now).toISOString() };
  return { action: 'block', state: next };
}

const clean = (s) => String(s).replace(/[\t\r\n]+/g, ' ').trim();

/** Pure: one log line, tab-separated: time, sha, status, mode, action, tokens, unproven, session, note. */
function logLine({ now, sha, status, mode, action, tokens, unproven, session, note }) {
  return [new Date(now).toISOString(), sha, status, mode, action, tokens.join(','), unproven.join(','), session, note].map(clean).join('\t');
}

function blockMessage(result, config) {
  const why = result.status === 'unstamped'
    ? 'This commit has no Verified: line.'
    : `The stamp names ${result.unproven.join(', ')} but no fresh marker exists for this HEAD.`;
  return [
    `verify: ${why}`,
    'Run the verify skill, then put "Verified: <tokens>" in the last paragraph, directly above the co-author trailer.',
    `Run the full check ending in "node .verify/mark-pass.js" if the stamp names "${config.fullToken}".`,
    'If nothing could run, write "Verified: none (<reason>)" and an "Owed:" line in the body.',
    `After ${MAX_BLOCKS} blocks in one session, the next commit passes.`,
  ].join('\n');
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function main() {
  const msgFile = process.argv[2];
  if (!msgFile) return 0;
  const root = git(['rev-parse', '--show-toplevel'], process.cwd());
  const { config } = loadConfig(root);
  const mode = process.env.VERIFY_MODE || config.mode;
  if (mode === 'off') return 0;
  const common = gitCommonDir(root);
  const gitDir = path.resolve(root, git(['rev-parse', '--git-dir'], root));
  let headSha = '';
  try { headSha = git(['rev-parse', 'HEAD'], root); } catch { /* first commit */ }
  const files = git(['diff', '--cached', '--name-only'], root).split('\n').filter(Boolean);
  const now = Date.now();
  const result = evaluate({
    message: fs.readFileSync(msgFile, 'utf8'),
    files,
    isMerge: fs.existsSync(path.join(gitDir, 'MERGE_HEAD')),
    config,
    markers: readJson(path.join(common, 'verify-marker.json'), {}),
    headSha,
    now,
  });
  const session = process.env.CLAUDE_SESSION_ID || process.env.VERIFY_SESSION || 'default';
  const stateFile = path.join(common, 'verify-blocks.json');
  const verdict = decide({ status: result.status, mode, state: readJson(stateFile, {}), session, now, sessionMinutes: config.sessionMinutes });
  fs.writeFileSync(stateFile, JSON.stringify(verdict.state));
  fs.appendFileSync(path.join(common, 'verify-log.tsv'), `${logLine({ now, sha: headSha.slice(0, 10), ...result, mode, action: verdict.action, session })}\n`);
  if (verdict.action === 'released') console.error('verify: 2 blocks in this session, so this commit passes. Add the stamp next time.');
  if (verdict.action === 'block') { console.error(blockMessage(result, config)); return 1; }
  return 0;
}

if (require.main === module) {
  let code = 0;
  try { code = main(); } catch { code = 0; }
  process.exit(code);
}
module.exports = { evaluate, decide, logLine, blockMessage, MAX_BLOCKS };
