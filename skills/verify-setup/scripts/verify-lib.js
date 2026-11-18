// Pure helpers shared by the verify scripts. No dependencies. Copied into the repo with them.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const DEFAULTS = {
  mode: 'observe',
  agentTrailer: '^Co-Authored-By:.*(Claude|Codex|Copilot|Cursor|Gemini)',
  fullToken: 'full',
  provenTokens: ['full'],
  markerMaxAgeMinutes: 120,
  sessionMinutes: 120,
  skipPaths: ['**/*.md', 'docs/**', 'LICENSE'],
  checks: [],
};

/** Turn a path glob into a RegExp. Supports **, *, ? and {a,b}. A glob with no slash matches any basename. */
function globToRegex(glob) {
  let g = String(glob);
  const anywhere = !g.includes('/');
  let re = '';
  let depth = 0;
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*') {
      if (g[i + 1] === '*') {
        i++;
        if (g[i + 1] === '/') { i++; re += '(?:.*/)?'; } else re += '.*';
      } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else if (c === '{') { depth++; re += '(?:'; }
    else if (c === '}' && depth > 0) { depth--; re += ')'; }
    else if (c === ',' && depth > 0) re += '|';
    else re += c.replace(/[.+^$()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${anywhere ? '(?:.*/)?' : ''}${re}$`);
}

function matchesAny(file, globs) {
  return (globs || []).some((g) => globToRegex(g).test(file));
}

/** Drop git's comment lines and trailing blank lines. */
function cleanMessage(msg) {
  return String(msg).replace(/\r\n/g, '\n').split('\n').filter((l) => !l.startsWith('#')).join('\n').replace(/\s+$/, '');
}

/** The last block of the message: the only place a stamp or a co-author trailer counts. */
function lastParagraph(msg) {
  const parts = cleanMessage(msg).split(/\n\s*\n/);
  return parts[parts.length - 1] || '';
}

/** Read the stamp from the last paragraph only. Returns { found, none, reason, tokens }. */
function parseStamp(msg) {
  const lines = lastParagraph(msg).split('\n');
  const line = lines.find((l) => /^Verified:/i.test(l));
  if (line === undefined) return { found: false, none: false, reason: '', tokens: [] };
  const body = line.replace(/^Verified:\s*/i, '').trim();
  const none = body.match(/^none\b\s*(?:\((.*)\))?\s*$/i);
  if (none) return { found: true, none: true, reason: (none[1] || '').trim(), tokens: [] };
  const tokens = body.split(/[,\s]+/).map((t) => t.toLowerCase()).filter((t) => /^[a-z0-9][a-z0-9_.:-]*$/.test(t));
  return { found: tokens.length > 0, none: false, reason: '', tokens: [...new Set(tokens)] };
}

/** True when the last paragraph has a trailer line matching the config's agent pattern. */
function isAgentCommit(msg, pattern) {
  let re;
  try { re = new RegExp(pattern, 'i'); } catch { return false; }
  return lastParagraph(msg).split('\n').some((l) => re.test(l));
}

function isDocsOnly(files, skipPaths) {
  return files.length > 0 && files.every((f) => matchesAny(f, skipPaths));
}

/** Is the marker for this token valid: same head sha, young enough. */
function markerValid(marker, headSha, nowMs, maxAgeMinutes) {
  if (!marker || typeof marker !== 'object') return false;
  if (!headSha || marker.sha !== headSha) return false;
  const t = Date.parse(marker.time);
  if (Number.isNaN(t)) return false;
  const age = nowMs - t;
  return age >= -60000 && age <= maxAgeMinutes * 60000;
}

function mergeConfig(user) {
  const cfg = { ...DEFAULTS, ...(user || {}) };
  if (!user || !user.provenTokens) cfg.provenTokens = [cfg.fullToken];
  return cfg;
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function gitCommonDir(cwd) {
  return path.resolve(cwd, git(['rev-parse', '--git-common-dir'], cwd));
}

/** Find the config: VERIFY_CONFIG, then <repo>/.verify/config.json, then ~/.claude/verify-setup/<repo>/config.json. */
function configPaths(repoRoot, env = process.env, home = os.homedir()) {
  const list = [];
  if (env.VERIFY_CONFIG) list.push(env.VERIFY_CONFIG);
  list.push(path.join(repoRoot, '.verify', 'config.json'));
  list.push(path.join(home, '.claude', 'verify-setup', path.basename(repoRoot), 'config.json'));
  return list;
}

function loadConfig(repoRoot) {
  for (const p of configPaths(repoRoot)) {
    if (fs.existsSync(p)) return { path: p, config: mergeConfig(JSON.parse(fs.readFileSync(p, 'utf8'))) };
  }
  return { path: null, config: mergeConfig({}) };
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) { out[key] = next; i++; } else out[key] = true;
    } else out._.push(a);
  }
  return out;
}

module.exports = {
  DEFAULTS, globToRegex, matchesAny, cleanMessage, lastParagraph, parseStamp, isAgentCommit, isDocsOnly,
  markerValid, mergeConfig, git, gitCommonDir, configPaths, loadConfig, parseArgs,
};
