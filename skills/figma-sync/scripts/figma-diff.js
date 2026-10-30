#!/usr/bin/env node
/**
 * Which Figma sections need a sync? Lists every UI file changed since the last Figma sync, grouped by the
 * Figma section that draws it, plus changed files no rule covers and screens no section covers. Reads only
 * (except --mark, which writes the record).
 *
 *   node figma-diff.js                  changes since the last sync, up to HEAD
 *   node figma-diff.js --to origin/main
 *   node figma-diff.js --json           the same, as JSON (for a scheduled drift check)
 *   node figma-diff.js --mark           after a sync: record HEAD (or --to) as the last synced commit
 *   node figma-diff.js --mark --note "snapshot of <product commit>"
 *   node figma-diff.js --config ../other-repo/figma-sync.web.config.js
 *                                       a config (and record) kept outside this repo, for a read-only product
 *
 * Setup: copy figma-sync.config.example.js to figma-sync.config.js in the repo root and edit it. The record
 * of the last synced commit lives at the path the config names (default figma-sync.json), relative to the
 * config's folder. The script may live anywhere: it diffs the repo it is run in (found with
 * `git rev-parse --show-toplevel` from the working directory).
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const CONFIG_NAME = 'figma-sync.config.js';

/** Fill in defaults for anything the config leaves out. */
function withDefaults(cfg) {
  return {
    record: 'figma-sync.json',
    uiPaths: [],
    routeFiles: null,
    uiFile: /\.(tsx?|jsx?)$/,
    ignore: [],
    rules: [],
    designSystem: 'Design System',
    overlays: [],
    ...cfg,
  };
}

/**
 * @param {string} file repo-relative path
 * @param {object} cfg the config
 * @returns {string[] | null} Figma sections, [] for an ignored file, null when no rule knows it
 */
function sectionsFor(file, cfg) {
  const c = withDefaults(cfg);
  if (c.ignore.some((re) => re.test(file))) return [];
  for (const [re, sections] of c.rules) if (re.test(file)) return sections;
  return null;
}

/** True when the file sits under one of the config's uiPaths (plain folders) and has a UI extension. */
function isUiFile(file, c) {
  const inPaths = !c.uiPaths.length || c.uiPaths.some((p) => {
    const dir = p.replace(/\/+$/, '');
    return file === dir || file.startsWith(dir + '/');
  });
  return inPaths && c.uiFile.test(file);
}

/**
 * Group changed files by the Figma section that draws them.
 * @param {string[]} files repo-relative paths (non-UI files are skipped)
 * @param {object} cfg the config
 * @returns {{ sections: Map<string, string[]>, unmapped: string[] }}
 */
function sectionsForFiles(files, cfg) {
  const c = withDefaults(cfg);
  const sections = new Map();
  const unmapped = [];
  for (const file of files) {
    if (!isUiFile(file, c)) continue;
    const hit = sectionsFor(file, c);
    if (hit === null) { unmapped.push(file); continue; }
    for (const s of hit) {
      if (!sections.has(s)) sections.set(s, []);
      sections.get(s).push(file);
    }
  }
  return { sections, unmapped };
}

/**
 * Screens that no rule maps to a section: a page a person can reach that Figma may lack.
 * @param {string[]} routeFiles every file under the route folder
 * @param {object} cfg the config
 * @returns {string[]}
 */
function routesWithoutSection(routeFiles, cfg) {
  const c = withDefaults(cfg);
  if (!c.routeFiles) return [];
  return routeFiles.filter((f) => c.routeFiles.screen.test(f) && sectionsFor(f, c) === null);
}

/** Every section name the rules point at (not the design system), for a check that each exists in Figma. */
function allSections(cfg) {
  const c = withDefaults(cfg);
  return [...new Set(c.rules.flatMap(([, s]) => s))].filter((s) => s !== c.designSystem);
}

/**
 * @param {string} text contents of the record file
 * @returns {{ lastSyncedCommit: string, syncedAt: string, note?: string }}
 */
function parseSyncRecord(text) {
  const rec = JSON.parse(text);
  if (!/^[0-9a-f]{7,40}$/.test(rec.lastSyncedCommit ?? '')) throw new Error('the record: lastSyncedCommit is not a commit sha');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rec.syncedAt ?? '')) throw new Error('the record: syncedAt is not YYYY-MM-DD');
  return rec;
}

/**
 * Where the config and the record live. The config defaults to the repo root; the record sits beside the config.
 * @param {string|undefined} configArg the --config value, if any
 * @param {object} cfg the config (for its record path); may be omitted to get only the config path
 * @param {{ root: string, cwd: string }} where the repo root and the working directory
 */
function locate(configArg, cfg, { root, cwd }) {
  const configPath = configArg ? path.resolve(cwd, configArg) : path.join(root, CONFIG_NAME);
  const recordPath = cfg ? path.resolve(path.dirname(configPath), withDefaults(cfg).record) : null;
  return { configPath, recordPath };
}

function checkConfig(c) {
  if (!Array.isArray(c.rules) || !c.rules.every((r) => Array.isArray(r) && r[0] instanceof RegExp && Array.isArray(r[1]))) {
    throw new Error(`${CONFIG_NAME}: rules must be an array of [regex, [section names]]`);
  }
  if (c.routeFiles && !(c.routeFiles.screen instanceof RegExp)) throw new Error(`${CONFIG_NAME}: routeFiles.screen must be a regex`);
}

// Command line ---------------------------------------------------------------------------------------------

function fail(msg) {
  console.error(`figma-sync: ${msg}`);
  process.exit(1);
}

function main() {
  const run = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  let root;
  try { root = run(process.cwd(), 'rev-parse', '--show-toplevel').trim(); } catch { fail('run this inside a git repository.'); }
  const git = (...args) => run(root, ...args).trim();
  const lines = (...args) => run(root, ...args).split('\n').filter(Boolean);

  const argv = process.argv.slice(2);
  const has = (name) => argv.includes(name);
  const value = (name, example) => {
    const i = argv.indexOf(name);
    if (i < 0) return undefined;
    if (!argv[i + 1] || argv[i + 1].startsWith('--')) fail(`${name} needs a value, for example ${name} ${example}.`);
    return argv[i + 1];
  };
  const to = value('--to', 'origin/main') ?? 'HEAD';
  const configArg = value('--config', '../other-repo/figma-sync.config.js');
  const note = value('--note', '"snapshot of 0b0ff041"');

  const { configPath } = locate(configArg, null, { root, cwd: process.cwd() });
  if (!fs.existsSync(configPath)) {
    fail(`no config at ${configPath}. Copy figma-sync.config.example.js (next to this script) there and edit it.`);
  }
  const cfg = withDefaults(require(configPath));
  checkConfig(cfg);
  const { recordPath } = locate(configArg, cfg, { root, cwd: process.cwd() });
  const toSha = git('rev-parse', '--verify', `${to}^{commit}`);

  if (has('--mark')) {
    let base = {};
    if (fs.existsSync(recordPath)) base = parseSyncRecord(fs.readFileSync(recordPath, 'utf8'));
    const today = new Date().toISOString().slice(0, 10);
    const next = { ...base, lastSyncedCommit: toSha, syncedAt: today, ...(note ? { note } : {}) };
    fs.mkdirSync(path.dirname(recordPath), { recursive: true });
    fs.writeFileSync(recordPath, JSON.stringify(next, null, 2) + '\n');
    console.log(`figma-sync: recorded ${toSha.slice(0, 8)} (${today}) as the last synced commit in ${recordPath}.`);
    return;
  }

  if (!fs.existsSync(recordPath)) {
    fail(`no record at ${recordPath}. Once Figma matches the code, run this script with --mark to create it.`);
  }
  const record = parseSyncRecord(fs.readFileSync(recordPath, 'utf8'));
  const range = `${record.lastSyncedCommit}..${toSha}`;

  const spec = cfg.uiPaths.length ? ['--', ...cfg.uiPaths] : [];
  const changed = lines('-c', 'core.quotepath=off', 'diff', '--name-only', range, ...spec);
  const { sections, unmapped } = sectionsForFiles(changed, cfg);
  let routes = [];
  if (cfg.routeFiles) {
    const rf = cfg.routeFiles.pathspec;
    routes = lines('-c', 'core.quotepath=off', 'ls-files', '--', ...(Array.isArray(rf) ? rf : [rf]));
  }
  const uncovered = routesWithoutSection(routes, cfg);
  const commits = Number(git('rev-list', '--count', range));

  if (has('--json')) {
    console.log(JSON.stringify({
      since: record.lastSyncedCommit, sinceDate: record.syncedAt, to: toSha, commits,
      sections: Object.fromEntries(sections), unmapped, uncoveredRoutes: uncovered,
      // For a drift check: every section that must exist in Figma, and the overlay screens (no route of
      // their own) that must each have a frame whose name matches `frame`.
      expectedSections: allSections(cfg),
      overlays: cfg.overlays.map((o) => ({ file: o.file, frame: o.frame.source, flags: o.frame.flags })),
    }, null, 2));
    return;
  }

  console.log(`Figma sync check: ${commits} commits since ${record.lastSyncedCommit.slice(0, 8)} (synced ${record.syncedAt}), up to ${toSha.slice(0, 8)}.\n`);
  if (!sections.size && !unmapped.length) console.log('No screen, component or token changed. Figma is up to date.');
  for (const [section, files] of [...sections].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`${section} (${files.length})`);
    for (const f of files) console.log(`  ${f}`);
  }
  if (unmapped.length) {
    console.log(`\nChanged files no rule maps to a Figma section (add a rule in ${CONFIG_NAME}, or check by hand):`);
    for (const f of unmapped) console.log(`  ${f}`);
  }
  if (uncovered.length) {
    console.log('\nScreens with no Figma section at all (a page Figma may be missing):');
    for (const f of uncovered) console.log(`  ${f}`);
  }
}

module.exports = { sectionsFor, sectionsForFiles, routesWithoutSection, parseSyncRecord, allSections, withDefaults, locate };

if (require.main === module) {
  try { main(); } catch (e) { fail(String(e.message || e).split('\n')[0]); }
}
