#!/usr/bin/env node
/**
 * Read one Claude Code session transcript and print what went wrong in it, counted, so a retro starts from
 * evidence instead of a skim. A long session's transcript runs to hundreds of megabytes; this reads it in one
 * pass.
 *
 *   node scan.js <transcript.jsonl | session id>                 the whole session
 *   node scan.js <session> --since 2026-10-28T19:33:00Z          from that time on (the last retro's End line)
 *   node scan.js <session> --runs                                list earlier retros and compactions, then stop
 *   node scan.js <session> --json                                the same findings as JSON
 *   options: --projects <dir, default ~/.claude/projects>  --pattern "<regex>" (repeatable, extra silent failures)
 *
 * What it counts:
 * - Flagged errors: tool results marked as errors, grouped by their first line.
 * - Hidden failures: text in a result that shows a failure (zsh "no matches found", "command not found", a
 *   Python traceback), with how many results were NOT marked as errors. The command after a `;` still ran, so
 *   the result looks fine; these are the ones a skim misses.
 * - Guardrails: hook blocks, permission denials and stop-hook messages, grouped. A guardrail that fires often
 *   on correct work is a finding too.
 * - Repeats: the same command run 3 or more times.
 * - Heavy results: tool results over 30,000 characters, by tool.
 * - Unproven work, four counts: a `git commit` with no test, build, lint or type check since the last file edit;
 *   a check re-run with no edit between, failing then passing (a hidden flake); the same check failing 4 or more
 *   times in a row with edits between, before the person was asked (a fix loop); a sleep or retry added to a test
 *   file. Edits to .md and .txt files do not need a check.
 * - The person's messages, cut short, to find corrections.
 * A resumed or compacted session replays its history, so each tool call counts once (by its id). Subagent
 * records (isSidechain) are left out. Anything that looks like a secret is masked.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');

// Each pattern matches only at the start of a line, in the exact form the shell or tool prints. A command that
// prints a log or a file which quotes such a line (a retro reading a transcript, say) is not a failure itself.
const SILENT = [
  { name: 'zsh: unmatched glob, the command did not run', re: /^(\(eval\)|zsh):\d+: no matches found: /m },
  { name: 'command not found', re: /^(\(eval\)|zsh|bash|sh)(:\d+)?: (command not found: \S+|(line \d+: )?\S+: command not found)/m },
  { name: 'Python traceback', re: /^Traceback \(most recent call last\):$/m },
  { name: 'missing file or folder', re: /^[^\n]{1,160}: No such file or directory$/m },
  { name: 'permission denied (file system)', re: /^[^\n]{1,160}: Permission denied$/m },
  { name: 'npm error', re: /^npm (ERR!|error) /m },
  { name: 'git fatal', re: /^fatal: /m },
];
// A hook's own message starts the result ("PreToolUse:Bash hook error: ..."); output that only mentions hooks does not.
const HOOK = /^(Pre|Post)ToolUse:\S* ?hook (error|blocked)|^[^\n]{0,80}blocked by [^\n]{0,40}hook/i;
// Text the harness adds to the person's turn: pictures, a loaded skill's body, a resumed session's summary, and a
// subagent's or another session's report handed back to this one.
const NOT_TYPED =
  /^(\[Image|Base directory for this skill:|This session is being continued from a previous conversation|Another Claude session sent a message:)/;
const DENIED = /Permission for this action was denied|doesn't want to proceed|was rejected by the user|user denied/i;
const RETRO_COMMAND = /<command-name>\/?(retro|retro-session)[^<]*<\/command-name>/;
const COMPACT = /<command-name>\/compact<\/command-name>|"subtype":"compact_boundary"/;
const HEAVY = 30000;
const LOOP_AT = 4; // the same check failing this many times in a row, with edits between, is a fix loop

const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const DOC_FILE = /\.(md|mdx|txt)$/i;
const TEST_FILE = /(\.|[-_])(test|spec)\.[cm]?[jt]sx?$|(^|\/)(__tests__|tests?|spec|e2e)\/|(^|\/)test_[^/]*\.py$|_test\.(py|go|rb)$|Tests?\.(swift|kt|java)$|_spec\.rb$/;
// What a test file must not gain: a pause, or a loop that runs the test until it passes.
const WAIT_OR_RETRY = /\b(sleep|setTimeout|retryTimes|withRetry|retryable|retries)\b|\bretry\w*\s*\(|\b(Thread|time)\.sleep|\bretry[A-Z_]\w*/;
const WRAPPER = /^(npx|bunx|pnpm exec|pnpm dlx|yarn|uv run|poetry run|bundle exec|python3? -m|time|(with-)?timeout \d+)\s+/;
const CHECK =
  /^(jest|vitest|pytest|mocha|rspec|tsc|eslint|biome|ruff|mypy|xcodebuild|node --test|(cargo|go|swift|dotnet|flutter|mvn|make|\.?\/?gradlew?) (test|check|clippy|vet|build|verify|lint)|(npm|pnpm|yarn|bun)( run)? (t|test|build|lint|typecheck|type-check|check|validate|verify|ci)|playwright test)\b/;
const COMMIT = /^(?:\S+=\S+\s+)*git(?:\s+-[Cc]\s+\S+)*\s+commit\b/;
const ASK_TOOLS = new Set(['AskUserQuestion']);

/** The parts of a command that run one after another. Quoted text (a commit message) is not a command. */
function segments(command) {
  const bare = String(command ?? '').replace(/"(?:[^"\\]|\\[\s\S])*"|'[^']*'/g, '""');
  return bare.split(/&&|\|\||;|\||\n/).map((x) => x.trim().replace(/^(\S+=\S+\s+)+/, '')).filter(Boolean);
}
const isCheck = (seg) => {
  let s = seg;
  for (let i = 0; i < 4; i += 1) {
    if (CHECK.test(s)) return true;
    const next = s.replace(WRAPPER, '');
    if (next === s) break;
    s = next;
  }
  return false;
};

function redact(s) {
  return String(s ?? '')
    .replace(/\b(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|xox[abpr]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|pk_[A-Za-z0-9_]{20,})\b/g, '<secret>')
    .replace(/((?:authorization|x-api-key|api[_-]?key|token|password|secret)["']?\s*[:=]\s*["']?)(?:bearer\s+)?[^\s"'&]{8,}/gi, '$1<secret>');
}

const short = (s, n) => {
  const t = redact(s).replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}...` : t;
};

function textOf(content) {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((c) => (typeof c === 'string' ? c : c?.type === 'text' ? c.text || '' : '')).join('\n');
}

/** A transcript path, or the newest file named after a session id under the projects folder. */
function resolveTranscript(arg, projectsDir) {
  if (arg && fs.existsSync(arg)) return arg;
  if (!arg || !fs.existsSync(projectsDir)) return null;
  const found = [];
  for (const dir of fs.readdirSync(projectsDir)) {
    const file = path.join(projectsDir, dir, `${arg.replace(/\.jsonl$/, '')}.jsonl`);
    if (fs.existsSync(file)) found.push(file);
  }
  return found.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] ?? null;
}

function newState(opts = {}) {
  return {
    since: opts.since ?? null,
    silent: [...SILENT, ...(opts.patterns ?? []).map((p) => ({ name: `pattern ${p}`, re: new RegExp(p, 'im') }))],
    uses: new Map(),
    seenResults: new Set(),
    runs: [],
    flagged: new Map(),
    silentHits: new Map(),
    guardrails: new Map(),
    commands: new Map(),
    heavy: new Map(),
    humans: [],
    unchecked: new Map(),
    reruns: new Map(),
    loops: new Map(),
    sleeps: new Map(),
    dirty: false, // a file was edited and no check has run since
    editSeq: 0,
    lastCheck: new Map(), // check command -> { failed, edit }
    streaks: new Map(), // check command -> { fails, lastEdit, loop }
    tools: new Map(),
    first: null,
    last: null,
  };
}

// Numbers in a key (a PR number, a line count) would split one repeating message into many.
const groupKey = (s) => s.replace(/\d+/g, 'N');

const bump = (map, key, example, unflagged = false) => {
  const e = map.get(key) ?? { count: 0, unflagged: 0, examples: [] };
  e.count += 1;
  if (unflagged) e.unflagged += 1;
  if (example && e.examples.length < 3) e.examples.push(example);
  map.set(key, e);
};

/** The person was asked or spoke: a fix loop that came before is no longer unattended. */
const askedPerson = (st) => st.streaks.clear();

/** One tool call: track edits, commits and check runs in the order the agent made them. */
function trackUse(st, b, input) {
  if (EDIT_TOOLS.has(b.name)) {
    const file = String(input.file_path ?? input.notebook_path ?? '');
    if (!DOC_FILE.test(file)) {
      st.editSeq += 1;
      st.dirty = true;
    }
    if (TEST_FILE.test(file)) {
      const edits = Array.isArray(input.edits) ? input.edits : [input];
      for (const e of edits) {
        const added = String(e.new_string ?? e.content ?? e.new_source ?? '');
        const hit = added.match(WAIT_OR_RETRY);
        if (hit && !WAIT_OR_RETRY.test(String(e.old_string ?? ''))) bump(st.sleeps, groupKey(file), `${short(file, 100)} adds ${hit[0]}`);
      }
    }
    return null;
  }
  if (ASK_TOOLS.has(b.name)) askedPerson(st);
  if (b.name !== 'Bash' || typeof input.command !== 'string') return null;
  let check = null;
  for (const seg of segments(input.command)) {
    if (isCheck(seg)) {
      st.dirty = false;
      check = redact(input.command).replace(/\s+/g, ' ').trim();
    } else if (COMMIT.test(seg) && st.dirty) {
      bump(st.unchecked, 'git commit with no check since the last edit', short(input.command, 100));
      st.dirty = false; // one commit counts once, not once per later commit
    }
  }
  return check ? { key: check, edit: st.editSeq } : null;
}

/** A check command finished: a pass after a fail with no edit between is a re-run; failures with edits between are a loop. */
function trackCheckResult(st, check, failed) {
  const prev = st.lastCheck.get(check.key);
  if (prev?.failed && !failed && prev.edit === check.edit) bump(st.reruns, groupKey(check.key), short(check.key, 100));
  st.lastCheck.set(check.key, { failed, edit: check.edit });
  if (!failed) return void st.streaks.delete(check.key);
  const s = st.streaks.get(check.key) ?? { fails: 0, lastEdit: null, loop: null };
  if (s.lastEdit !== check.edit) {
    s.fails += 1;
    s.lastEdit = check.edit;
    if (s.fails === LOOP_AT) {
      bump(st.loops, groupKey(check.key), null);
      s.loop = st.loops.get(groupKey(check.key));
    }
    if (s.loop) s.loop.examples = [`${short(check.key, 100)} failed ${s.fails} times in a row`];
  }
  st.streaks.set(check.key, s);
}

/** Feed one parsed transcript record. */
function addRecord(st, d) {
  if (!d || d.isSidechain) return;
  const ts = d.timestamp ?? null;
  const content = d.message?.content;
  const raw = typeof content === 'string' ? content : textOf(content);
  if (d.type === 'user' && RETRO_COMMAND.test(raw) && ts) st.runs.push({ at: ts, kind: 'retro' });
  if (COMPACT.test(raw) && ts) st.runs.push({ at: ts, kind: 'compact' });
  if (st.since && ts && ts < st.since) {
    if (Array.isArray(content)) for (const b of content) if (b?.type === 'tool_use') st.uses.set(b.id, null);
    return;
  }
  if (ts) {
    if (!st.first || ts < st.first) st.first = ts;
    if (!st.last || ts > st.last) st.last = ts;
  }
  if (d.type === 'user' && typeof content === 'string' && !content.startsWith('<')) {
    if (/^Stop hook feedback:/.test(content)) bump(st.guardrails, groupKey(`stop hook: ${short(content.split('\n')[1] ?? '', 90)}`), ts);
    else if (!NOT_TYPED.test(content)) {
      st.humans.push({ at: ts, text: short(content, 240) });
      askedPerson(st);
    }
  }
  if (!Array.isArray(content)) return;
  for (const b of content) {
    if (b?.type === 'text' && d.type === 'user' && b.text && !b.text.startsWith('<')) {
      if (/^Stop hook feedback:/.test(b.text)) bump(st.guardrails, groupKey(`stop hook: ${short(b.text.split('\n')[1] ?? '', 90)}`), ts);
      else if (!NOT_TYPED.test(b.text)) {
        st.humans.push({ at: ts, text: short(b.text, 240) });
        askedPerson(st);
      }
    }
    if (b?.type === 'tool_use' && !st.uses.has(b.id)) {
      const input = b.input ?? {};
      const check = trackUse(st, b, input);
      st.uses.set(b.id, { tool: b.name, input: input.command ?? JSON.stringify(input), check });
      st.tools.set(b.name, (st.tools.get(b.name) ?? 0) + 1);
      // The whole command is the key: many different commands share a long first line (a cd, a path).
      if (typeof input.command === 'string') bump(st.commands, redact(input.command).replace(/\s+/g, ' ').trim());
    }
    if (b?.type === 'tool_result' && !st.seenResults.has(b.tool_use_id)) {
      st.seenResults.add(b.tool_use_id);
      const use = st.uses.get(b.tool_use_id);
      if (use === null) continue; // its call was before --since
      const text = textOf(b.content);
      const tool = use?.tool ?? '?';
      const call = short(use?.input ?? '', 140);
      if (text.length > HEAVY) bump(st.heavy, tool, `${call} (${text.length} chars)`);
      // Only the start of a result is the harness speaking; later text can be a log that quotes a denial.
      if (DENIED.test(text.slice(0, 200))) bump(st.guardrails, groupKey(`permission denied: ${short(text, 90)}`), call);
      else if (HOOK.test(text.slice(0, 200))) bump(st.guardrails, groupKey(`hook: ${short(text, 110)}`), call);
      else {
        if (use?.check) trackCheckResult(st, use.check, Boolean(b.is_error));
        if (b.is_error) bump(st.flagged, `${tool}: ${short(text.split('\n').find((l) => l.trim() && !/^Exit code/.test(l)) ?? text, 110)}`, call);
      }
      for (const p of st.silent) {
        if (p.re.test(text)) bump(st.silentHits, p.name, `${call} -> ${short(text.match(new RegExp(`.{0,40}${p.re.source}.{0,60}`, 'im'))?.[0] ?? '', 120)}`, !b.is_error);
      }
    }
  }
}

const sorted = (map, min = 1) => [...map.entries()].filter(([, v]) => v.count >= min).sort((a, b) => b[1].count - a[1].count);

function summary(st) {
  return {
    window: { from: st.first, to: st.last, since: st.since },
    tools: Object.fromEntries([...st.tools.entries()].sort((a, b) => b[1] - a[1])),
    silentFailures: sorted(st.silentHits).map(([k, v]) => ({ what: k, ...v })),
    flaggedErrors: sorted(st.flagged).map(([k, v]) => ({ what: k, ...v })),
    guardrails: sorted(st.guardrails).map(([k, v]) => ({ what: k, ...v })),
    repeats: sorted(st.commands, 3).map(([k, v]) => ({ command: short(k, 160), count: v.count })),
    uncheckedCommits: sorted(st.unchecked).map(([k, v]) => ({ what: k, ...v })),
    rerunsUntilGreen: sorted(st.reruns).map(([k, v]) => ({ what: k, ...v })),
    fixLoops: sorted(st.loops).map(([k, v]) => ({ what: k, ...v })),
    testSleeps: sorted(st.sleeps).map(([k, v]) => ({ what: k, ...v })),
    heavyResults: sorted(st.heavy).map(([k, v]) => ({ tool: k, ...v })),
    humans: st.humans,
  };
}

function toText(s) {
  const out = [`Window: ${s.window.from ?? '?'} to ${s.window.to ?? '?'}${s.window.since ? ` (since ${s.window.since})` : ''}`];
  out.push(`Tool calls: ${Object.entries(s.tools).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}`);
  const block = (title, rows, fmt) => {
    out.push('', `## ${title} (${rows.length})`);
    for (const r of rows.slice(0, 25)) out.push(fmt(r));
  };
  const ex = (r) => (r.examples?.length ? `\n    e.g. ${r.examples.join('\n    e.g. ')}` : '');
  block('Hidden failures', s.silentFailures, (r) => `- ${r.count}x ${r.what} (${r.unflagged} not marked as errors)${ex(r)}`);
  block('Guardrails that fired', s.guardrails, (r) => `- ${r.count}x ${r.what}${ex(r)}`);
  block('Flagged errors', s.flaggedErrors, (r) => `- ${r.count}x ${r.what}${ex(r)}`);
  block('Commits with no check since the last edit', s.uncheckedCommits, (r) => `- ${r.count}x${ex(r)}`);
  block('Checks re-run with no edit, failing then passing (a hidden flake)', s.rerunsUntilGreen, (r) => `- ${r.count}x ${r.what}`);
  block('Fix loops (the same check failing 4 or more times in a row, edits between, nobody asked)', s.fixLoops, (r) => `- ${r.count}x ${r.what}${ex(r)}`);
  block('Sleep or retry added to a test file', s.testSleeps, (r) => `- ${r.count}x${ex(r)}`);
  block('Repeated commands (3 or more)', s.repeats, (r) => `- ${r.count}x ${r.command}`);
  block('Heavy results (over 30,000 characters)', s.heavyResults, (r) => `- ${r.count}x ${r.tool}${ex(r)}`);
  block("The person's messages", s.humans, (h) => `- ${h.at ?? ''} ${h.text}`);
  return out.join('\n');
}

async function main(argv) {
  const args = { patterns: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--since') args.since = argv[++i];
    else if (a === '--projects') args.projects = argv[++i];
    else if (a === '--pattern') args.patterns.push(argv[++i]);
    else if (a === '--json') args.json = true;
    else if (a === '--runs') args.runs = true;
    else if (!a.startsWith('--')) args.target = a;
    else throw new Error(`Unknown option ${a}`);
  }
  const projects = args.projects ?? path.join(os.homedir(), '.claude', 'projects');
  const file = resolveTranscript(args.target, projects);
  if (!file) throw new Error('Name a transcript file or a session id (the file name under ~/.claude/projects/<project>/).');
  if (args.since && Number.isNaN(Date.parse(args.since))) throw new Error('--since needs a time, for example 2026-10-28T19:33:00Z.');
  const st = newState({ since: args.since ? new Date(args.since).toISOString() : null, patterns: args.patterns });
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    try {
      addRecord(st, JSON.parse(line));
    } catch {
      // A torn last line or a record in another shape: skip it.
    }
  }
  if (args.runs) {
    const seen = new Set();
    const runs = st.runs.filter((r) => !seen.has(`${r.kind}${r.at}`) && seen.add(`${r.kind}${r.at}`)).sort((a, b) => a.at.localeCompare(b.at));
    console.log(runs.map((r) => `${r.at} ${r.kind}`).join('\n') || 'No earlier retro or compaction.');
    return;
  }
  const s = summary(st);
  console.log(args.json ? JSON.stringify(s, null, 2) : toText(s));
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}

module.exports = { newState, addRecord, summary, toText, redact, resolveTranscript };
