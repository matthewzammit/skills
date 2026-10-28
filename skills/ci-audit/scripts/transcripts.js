#!/usr/bin/env node
/**
 * Read Claude Code transcripts for one repo and one window, and write every tool call, tagged, to one JSON file.
 * metrics.js reads that file, so every number in a report comes from the same parse.
 *
 *   node transcripts.js --out calls.json                    last week (Monday to Monday, local time)
 *   node transcripts.js --from 2026-10-19 --to 2026-10-26 --out calls.json   (--to is exclusive)
 *   node transcripts.js --days 7 --out calls.json
 *   options: --config <file>  --match <folder text> (repeatable)  --projects <dir, default ~/.claude/projects>
 *
 * The rules (see references/checks-agent-time.md):
 * - Source: ~/.claude/projects/<encoded path>/*.jsonl for the repo and its worktrees. Main threads only
 *   (isSidechain records are subagents). A resumed session replays its history, so tool calls are
 *   de-duplicated by tool_use id.
 * - Each call: tool time = its result's timestamp minus its tool_use timestamp. `msg` is the assistant message
 *   id, so calls sent in one message share it.
 * - Tags say what a call was (a push, a sleep, a simulator tap, a browser screenshot). The mobile and web
 *   add-ons only tag when the config turns them on; the repo's own helper scripts are tagged from the config.
 * Commands and results are cut short and anything that looks like a secret is masked.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');
const { parseArgs, windowFrom, loadConfig, run, repoRoot, redact, ms } = require('./common.js');

const short = (s, n) => (s && s.length > n ? s.slice(0, n) : s || '');

/** Claude Code names a project folder after its path, with every character that is not a letter or digit as "-". */
const encodeProjectPath = (p) => p.replace(/[^a-zA-Z0-9]/g, '-');

/**
 * Which ~/.claude/projects folders belong to this repo. With `match` texts: any folder whose name contains one.
 * Otherwise: the folder of each current worktree, and worktrees nested in a hidden folder inside it (`.claude/worktrees/x`
 * encodes as `<folder>--claude-worktrees-x`). A sibling repo (`app-two` beside `app`) does not match.
 */
function projectFolders(projectsDir, { match, worktrees }) {
  if (!fs.existsSync(projectsDir)) return [];
  const names = fs.readdirSync(projectsDir).filter((n) => fs.statSync(path.join(projectsDir, n)).isDirectory());
  if (match && match.length) return names.filter((n) => match.some((m) => n.includes(m)));
  const prefixes = worktrees.map(encodeProjectPath);
  return names.filter((n) => prefixes.some((p) => n === p || n.startsWith(`${p}--`)));
}

function worktreePaths(root) {
  try {
    return run('git', ['worktree', 'list', '--porcelain'], { cwd: root })
      .split('\n').filter((l) => l.startsWith('worktree ')).map((l) => l.slice(9));
  } catch { return [root]; }
}

function textOf(content) {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  return content.map((c) => {
    if (typeof c === 'string') return c;
    if (c && c.type === 'text') return c.text || '';
    if (c && c.type === 'image') return '[image]';
    return '';
  }).join('\n');
}

/** A human message: Claude Code marks it with origin.kind "human"; older transcripts have no origin field. */
function isHumanMessage(d, content) {
  if (d.isMeta || d.isCompactSummary) return false;
  if (/^This session is being continued from a previous conversation/.test(textOf(content).trimStart())) return false;
  if (d.origin) return d.origin.kind === 'human';
  const t = textOf(content).trimStart();
  return t.length > 0 && !/^(<command-|<local-command|<system-reminder>|Caveat:|\[Request interrupted)/.test(t);
}

/**
 * Fold transcript records into tool uses, results, human messages and sessions. Pure: give it parsed records.
 * `state` carries over between files.
 */
function newState() { return { uses: new Map(), results: new Map(), humans: [], sessions: {}, lines: 0 }; }

function addRecord(state, d, folder, file, win) {
  if (d.type !== 'assistant' && d.type !== 'user') return;
  if (d.isSidechain) return;
  const ts = d.timestamp;
  if (!ts || ts < win.startIso || ts >= win.endIso) return;
  state.lines++;
  const sid = d.sessionId || folder;
  const meta = state.sessions[sid] || (state.sessions[sid] = {
    folder, cwd: d.cwd || null, branch: d.gitBranch || null, first: ts, last: ts, n_use: 0, n_human: 0, files: new Set(),
  });
  meta.files.add(file);
  if (ts < meta.first) meta.first = ts;
  if (ts > meta.last) meta.last = ts;
  if (d.cwd && !meta.cwd) meta.cwd = d.cwd;
  if (d.gitBranch) meta.branch = d.gitBranch;
  const msg = d.message || {};
  const content = msg.content;
  if (d.type === 'assistant') {
    if (!Array.isArray(content)) return;
    const mid = msg.id || d.requestId || d.uuid;
    for (const c of content) {
      if (!c || c.type !== 'tool_use' || !c.id || state.uses.has(c.id)) continue;
      state.uses.set(c.id, useRecord(c, { sid, folder, d, mid }));
      meta.n_use++;
    }
    return;
  }
  let isResult = false;
  if (Array.isArray(content)) {
    for (const c of content) {
      if (!c || c.type !== 'tool_result') continue;
      isResult = true;
      if (!c.tool_use_id || state.results.has(c.tool_use_id)) continue;
      let txt = textOf(c.content);
      const extra = {};
      const tur = d.toolUseResult;
      if (tur && typeof tur === 'object') {
        for (const k of ['stdout', 'stderr']) {
          if (typeof tur[k] === 'string' && tur[k]) extra[`${k}_tail`] = redact(tur[k].slice(-600));
        }
        if (tur.interrupted) extra.interrupted = true;
        if (tur.isImage) extra.image = true;
      } else if (typeof tur === 'string' && !txt) txt = tur;
      state.results.set(c.tool_use_id, { ts, txt, isError: Boolean(c.is_error), extra });
    }
  }
  if (!isResult && isHumanMessage(d, content)) {
    state.humans.push({ session: sid, ts, text: redact(short(textOf(content), 160)) });
    meta.n_human++;
  }
}

function useRecord(c, { sid, folder, d, mid }) {
  const inp = c.input || {};
  const name = c.name || '';
  const rec = { id: c.id, session: sid, folder, cwd: d.cwd || null, branch: d.gitBranch || null, msg: mid, name, ts_use: d.timestamp };
  if (name === 'Bash') {
    rec.cmd = redact(short(inp.command || '', 4000));
    rec.bg = Boolean(inp.run_in_background);
    rec.desc = short(inp.description || '', 120);
  } else if (['Read', 'Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(name)) {
    rec.path = inp.file_path || inp.notebook_path || null;
  } else {
    if (typeof inp.action === 'string') rec.action = inp.action;
    if (inp.device || inp.udid) rec.device = inp.device || inp.udid;
    const slim = {};
    for (const [k, v] of Object.entries(inp)) if (!['points', 'points2', 'text', 'content', 'widget_code', 'script'].includes(k)) slim[k] = v;
    rec.input = redact(short(JSON.stringify(slim), 300));
  }
  return rec;
}

// Commands that only read; a pattern that appears inside one (grep "git push" docs/) does not count.
const READ_CMD = /^\s*(cat|grep|rg|sed|head|tail|less|ls|wc|awk|find|echo|diff|jq|git (log|show|diff|grep|status))\b/;
const SLEEP_ONLY = /^\s*sleep\s+(\d+(?:\.\d+)?)\s*(?:;\s*echo\s+[\w"' ]*\s*)?$/;
const SLEEP_ANY = /(?<![\w/.-])sleep\s+(\d+(?:\.\d+)?)/g;
const BOUND = /\$SECONDS|-lt\s+\d|-ge\s+\d|-gt\s+\d|-le\s+\d|\(\(|date \+%s|seq \d|\{1\.\.\d|for \w+ in \d/;
const INPUT_ACTIONS = new Set(['tap', 'swipe', 'text', 'button', 'press_key', 'touch_path', 'touch2_path', 'long_press', 'type', 'key',
  'left_click', 'right_click', 'double_click', 'triple_click', 'left_click_drag', 'scroll', 'click', 'hover', 'fill', 'select', 'drag', 'press']);

/** Compile the config's own tags: [{ pattern, tags: [..] }] for Bash commands, and the screen-read pattern. */
function compileConfig(config = {}) {
  const addons = new Set(config.addons || []);
  const custom = (config.tags || []).map((t) => ({ re: new RegExp(t.pattern), tags: [].concat(t.tags || t.tag || []) }));
  const gate = (config.gate && config.gate.commands) || [];
  return {
    addons,
    custom,
    gate: gate.map((g) => new RegExp(g)),
    screenRead: config.screenReads ? new RegExp(config.screenReads) : /\.(png|jpe?g|webp)$/i,
    pushFail: config.gate && config.gate.pushFailPattern ? new RegExp(config.gate.pushFailPattern) : null,
  };
}

/** Tag one call. `rec` has the use and its result already merged in. */
function tagCall(rec, cfg) {
  const tags = [];
  const add = (...t) => { for (const x of t) if (!tags.includes(x)) tags.push(x); };
  const { name } = rec;
  const body = `${rec.res_head || ''}${rec.res_tail || ''}`;
  const mobile = cfg.addons.has('mobile');
  const web = cfg.addons.has('web');

  if (rec.is_error && /hook error|blocked by hook/i.test(rec.res_head || '')) add('hook_refused');
  if (rec.is_error && /auto mode classifier/i.test(rec.res_head || '')) add('classifier_denied');
  if (rec.is_error && /doesn't want to proceed|user (rejected|denied)|permission (was )?denied/i.test(rec.res_head || '')) add('permission_denied');

  if (mobile && /simulator|emulator/i.test(name) && name.startsWith('mcp__')) {
    add('sim_tool');
    const a = rec.action;
    if (INPUT_ACTIONS.has(a)) add('input');
    if (a === 'screenshot') add('screenshot', 'screen_seen');
    if (a === 'launch' || a === 'open_url') add('relaunch');
  }
  if (web && name.startsWith('mcp__') && /browser|chrome|playwright|puppeteer/i.test(name)) {
    add('browser_tool');
    const a = rec.action || name.split('__').pop();
    if (INPUT_ACTIONS.has(a) || /^(browser_)?(click|type|fill|press_key|select_option|drag|hover|form_input)$/.test(a)) add('input');
    if (/screenshot/.test(a) || (rec.action === undefined && /screenshot/.test(name))) add('screenshot', 'screen_seen');
    if (/^(browser_)?(read_page|get_page_text|snapshot|find)$/.test(a) || /read_page|get_page_text|snapshot/.test(name)) add('page_read', 'screen_seen');
    if (/navigate/.test(a) || /navigate|preview_start/.test(name)) add('relaunch');
  }
  if (name === 'Read' && rec.path && (mobile || web) && cfg.screenRead.test(rec.path)) add('screen_read', 'screen_seen');

  const c = rec.cmd;
  if (name === 'Bash' && typeof c === 'string') {
    const readonly = READ_CMD.test(c);
    if (!readonly) {
      for (const t of cfg.custom) if (t.re.test(c)) add(...t.tags);
      if (cfg.gate.some((re) => re.test(c))) add('gate');
    }
    if (mobile && !readonly) {
      if (/xcrun simctl|\bsimctl\b/.test(c)) {
        add('simctl');
        if (/simctl io \S+ (--\S+ )?screenshot/.test(c)) add('screenshot', 'screen_seen');
        if (/simctl (terminate|launch|boot|shutdown)/.test(c)) add('hand_relaunch');
        if (/simctl openurl/.test(c)) add('openurl');
      }
      if (/(^|[;&|]\s*)axe\s+(tap|swipe|type|button|key|describe-ui)/.test(c)) {
        add('axe');
        if (/axe\s+describe-ui/.test(c)) add('ax_read', 'screen_seen');
        if (/axe\s+(tap|swipe|type|button|key)\b/.test(c)) add('input');
      }
      if (/\badb\b/.test(c)) {
        add('adb');
        if (/adb (-s \S+ )?shell input/.test(c)) add('adb_input', 'input');
        if (/adb (-s \S+ )?(exec-out|shell) screencap/.test(c)) add('screenshot', 'screen_seen');
      }
      if (/expo run:(ios|android)|npm run (ios|android|run:ios|run:android)\b|react-native run-(ios|android)|xcodebuild|pod install|expo prebuild|npm run prebuild|gradlew\s+\S*(assemble|bundle|install)|flutter (build|run)|fastlane\s/.test(c)) {
        add('native');
        if (/run:ios|npm run ios\b|run-ios|flutter run/.test(c)) add('native_run');
        if (/xcodebuild/.test(c)) add('xcodebuild');
        if (/pod install/.test(c)) add('pod_install');
        if (/prebuild/.test(c)) add('prebuild');
        if (/gradlew/.test(c)) add('gradle');
        if (/xcodebuild[^\n]*\barchive\b|fastlane\s+\S*(beta|release|archive)|gradlew\s+\S*bundleRelease/.test(c)) add('archive');
      }
    }
    if (web && !readonly) {
      if (/\b(npm|pnpm|yarn|bun) (run )?(dev|start|serve|preview)\b|\bnext (dev|start)\b|\bvite\b(?! build)|\bnuxt dev\b|\bastro dev\b|\bremix dev\b|\bwebpack serve\b|\bng serve\b/.test(c)) add('dev_server');
      if (/\bplaywright test\b|\bcypress run\b|\bnpm (run )?(e2e|test:e2e)\b|\bwdio\b|\bpuppeteer\b/.test(c)) add('browser_test');
      if (/\bvercel( deploy)?\b|\bnetlify deploy\b|\bwrangler (pages )?deploy\b|\bfirebase hosting:channel:deploy\b|\bfly deploy\b/.test(c)) add('preview_deploy');
      if (/EADDRINUSE|address already in use|port \d+ is (already )?in use/i.test(body)) add('port_in_use');
    }
    if (/git push/.test(c) && !/^\s*(cat|grep|sed|rg)\b/.test(c)) {
      add('git_push');
      if (/--no-verify/.test(c)) add('no_verify');
      if (/git push[^\n|]*\|/.test(c)) add('piped_push');
    }
    if (/\b(tsc|npm run typecheck|npm run type-check|vue-tsc|mypy|pyright)\b/.test(c)) add('typecheck');
    if (/\b(eslint|npm run lint|biome (check|lint)|ruff|golangci-lint|rubocop|swiftlint|ktlint)\b/.test(c)) add('lint');
    if (/\b(jest|vitest|npm (run )?test|pnpm test|yarn test|pytest|go test|cargo test|rspec|phpunit|mocha|node --test)\b/.test(c)) add('test');
    if (/\b(npm (ci|install|i)|pnpm (i|install)|yarn( install)?|bun install|pip install|bundle install|poetry install)\b/.test(c) && !readonly) add('install');
    if (SLEEP_ONLY.test(c)) add('sleep_only');
    if (/\b(until|while)\b/.test(c) && !readonly) {
      add('loop');
      if (!BOUND.test(c)) add('loop_unbounded');
    }
    if (/(^|\s)timeout\s+\d/.test(c)) add('timeout_cmd');
    let nominal = 0;
    for (const m of c.matchAll(SLEEP_ANY)) nominal += Number(m[1]) || 0;
    if (nominal) {
      rec.sleep_nominal_s = nominal;
      if (rec.is_error && /blocked|denied|refused|not allowed|hook/i.test(rec.res_head || '')) {
        rec.sleep_refused = true;
        add('refused');
      }
    }
  }
  // QA: the agent drives or watches a device or a browser, builds for one, or waits.
  const QA = ['sim_tool', 'simctl', 'axe', 'adb', 'native', 'screen_read', 'browser_tool', 'browser_test', 'dev_server',
    'preview_deploy', 'helper', 'screenshot', 'sleep_only', 'qa'];
  if ((mobile || web || tags.includes('qa')) && tags.some((t) => QA.includes(t))) add('qa');
  return tags;
}

/** Pair uses with results, tag them, and sort by time. */
function buildCalls(state, cfg) {
  const calls = [];
  for (const [id, use] of state.uses) {
    const r = state.results.get(id);
    const rec = { ...use };
    if (r) {
      rec.ts_res = r.ts;
      rec.tool_s = Math.round((ms(r.ts) - ms(use.ts_use))) / 1000;
      rec.res_head = redact(short(r.txt, 1200));
      rec.res_tail = r.txt.length > 1200 ? redact(r.txt.slice(-800)) : '';
      rec.is_error = r.isError;
      Object.assign(rec, r.extra);
    } else {
      Object.assign(rec, { ts_res: null, tool_s: null, res_head: '', res_tail: '', is_error: null });
    }
    rec.tags = tagCall(rec, cfg);
    calls.push(rec);
  }
  calls.sort((a, b) => (a.ts_use < b.ts_use ? -1 : a.ts_use > b.ts_use ? 1 : 0));
  return calls;
}

async function readFile(state, file, folder, win) {
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.includes('"type":"assistant"') && !line.includes('"type":"user"')) continue;
    let d;
    try { d = JSON.parse(line); } catch { continue; }
    addRecord(state, d, folder, path.basename(file), win);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.out) throw new Error('give --out <calls.json>');
  const win = windowFrom(args);
  const config = loadConfig(args);
  const cfg = compileConfig(config);
  const root = repoRoot() || process.cwd();
  const projectsDir = path.resolve(String(args.projects || path.join(os.homedir(), '.claude', 'projects')));
  const match = [].concat(args.match || (config.transcripts && config.transcripts.match) || []);
  const folders = projectFolders(projectsDir, { match, worktrees: worktreePaths(root) });
  const files = [];
  for (const f of folders) {
    const dir = path.join(projectsDir, f);
    for (const n of fs.readdirSync(dir)) {
      if (!n.endsWith('.jsonl')) continue;
      const p = path.join(dir, n);
      if (fs.statSync(p).mtimeMs >= win.start.getTime()) files.push({ p, folder: f });
    }
  }
  files.sort((a, b) => fs.statSync(a.p).mtimeMs - fs.statSync(b.p).mtimeMs);
  const state = newState();
  for (const { p, folder } of files) await readFile(state, p, folder, win);
  const calls = buildCalls(state, cfg);
  for (const s of Object.values(state.sessions)) s.files = [...s.files].sort();
  const out = {
    window: { from: win.from, to: win.to, start_utc: win.startIso, end_utc: win.endIso },
    addons: [...cfg.addons],
    folders,
    files: files.map((f) => path.relative(projectsDir, f.p)),
    sessions: state.sessions,
    humans: state.humans.sort((a, b) => (a.ts < b.ts ? -1 : 1)),
    calls,
    counts: { lines_in_window: state.lines, tool_uses: state.uses.size, results: state.results.size, humans: state.humans.length },
  };
  fs.writeFileSync(String(args.out), JSON.stringify(out));
  console.log(`${JSON.stringify(out.counts)} sessions: ${Object.keys(state.sessions).length} files: ${files.length} folders: ${folders.length}`);
  if (!folders.length) console.log(`No transcript folders matched. Looked in ${projectsDir} for ${match.length ? match.join(', ') : 'this repo\'s worktrees'}.`);
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });

module.exports = { encodeProjectPath, projectFolders, isHumanMessage, newState, addRecord, buildCalls, tagCall, compileConfig, textOf };
