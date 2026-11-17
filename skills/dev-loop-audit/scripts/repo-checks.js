#!/usr/bin/env node
/**
 * Static checks on the repo's own files: GitHub workflow files and git hooks. Reads only, no network.
 *
 *   node repo-checks.js [--out checks.json]
 *
 * Workflows (references/checks-ci.md): workflow files that are not on the remote main branch (GitHub never runs
 * them), jobs with no `timeout-minutes`, failures that cannot block (a job or step
 * with `continue-on-error: true`, `|| true` in a run line, a summary job with `if: always()` that never reads
 * `needs.*.result`), and path filters.
 * Hooks (references/checks-local.md): where git looks for hooks, which hooks exist and can run, which hook manager
 * the repo uses and whether it is installed, and which tools the hooks run that CI does not, and the other way.
 * Worktrees: each one runs its own branch's copy of a tracked hook folder and of `.claude/settings.json`, so an old
 * branch runs old hooks; the ones that differ from the main branch's worktree are listed.
 * Also: late skips (a step decides to skip after checkout and setup), full-history checkouts, and test growth
 * (test files and lines now against the window's start).
 * The files are read as they are now. With a window (--to), the commits since its end that changed workflows or
 * hooks are listed, so a finding the repo has already fixed is reported as "fixed since".
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { parseArgs, run, repoRoot, parseYaml, loadConfig, windowFrom, printElapsed } = require('./common.js');

const HOOK_NAMES = ['pre-commit', 'commit-msg', 'pre-push', 'prepare-commit-msg', 'post-checkout', 'post-merge', 'pre-rebase'];

/** Findings for one workflow file. `text` is its contents. */
function checkWorkflow(file, text) {
  const doc = parseYaml(text);
  const lines = text.split('\n');
  const lineOf = (re, from = 0) => {
    for (let i = from; i < lines.length; i++) if (re.test(lines[i])) return i + 1;
    return null;
  };
  const out = { file, name: doc.name || path.basename(file), jobs: [], findings: [], late_skips: [], full_history_checkouts: [] };
  const jobs = doc.jobs && typeof doc.jobs === 'object' ? doc.jobs : {};
  for (const [id, job] of Object.entries(jobs)) {
    if (!job || typeof job !== 'object') continue;
    const jobLine = lineOf(new RegExp(`^\\s{1,4}${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*$`)) || null;
    const steps = Array.isArray(job.steps) ? job.steps : [];
    const needs = [].concat(job.needs || []);
    const ifText = typeof job.if === 'string' ? job.if : '';
    const usesWorkflow = typeof job.uses === 'string';
    out.jobs.push({ id, name: job.name || id, timeout: job['timeout-minutes'] ?? null, needs, runs_on: job['runs-on'] ?? null, line: jobLine });
    if (job['timeout-minutes'] == null && !usesWorkflow) {
      out.findings.push({ kind: 'no_timeout', job: id, line: jobLine, note: 'no timeout-minutes: a hung job runs for 6 hours' });
    }
    if (job['continue-on-error'] === true) out.findings.push({ kind: 'continue_on_error', job: id, line: jobLine, note: 'the job can fail without failing the run' });
    if (/always\(\)|!cancelled\(\)|failure\(\)/.test(ifText) && needs.length) {
      const reads = JSON.stringify(job).match(/needs\.[\w*-]+\.result|contains\(needs|needs\.\*\.result|toJSON\(needs\)/);
      if (!reads) out.findings.push({ kind: 'summary_passes_on_failure', job: id, line: jobLine, note: `if: ${ifText.trim()} with needs [${needs.join(', ')}] but no step checks needs.*.result, so it passes when they fail` });
    }
    for (const l of lateSkips(steps)) out.late_skips.push({ file, job: id, step_id: l.step_id, after: l.after });
    if (fullHistoryCheckout(steps)) out.full_history_checkouts.push({ file, job: id });
    steps.forEach((st, i) => {
      if (!st || typeof st !== 'object') return;
      const label = st.name || st.uses || (typeof st.run === 'string' ? st.run.split('\n')[0].slice(0, 60) : `step ${i + 1}`);
      if (st['continue-on-error'] === true) out.findings.push({ kind: 'continue_on_error', job: id, step: label, line: lineOf(/continue-on-error:\s*true/, jobLine || 0), note: 'the step can fail without failing the job' });
      if (typeof st.run === 'string' && /\|\|\s*(true|:|exit 0)\b|\bset \+e\b/.test(st.run)) {
        const bad = st.run.split('\n').find((l) => /\|\|\s*(true|:|exit 0)\b|\bset \+e\b/.test(l)).trim();
        const at = lines.findIndex((l, n) => n >= (jobLine || 0) && l.includes(bad));
        out.findings.push({ kind: 'error_swallowed', job: id, step: label, line: at >= 0 ? at + 1 : null, text: bad.slice(0, 100), note: 'a command error is ignored (`|| true` or `set +e`); fine for an optional step, a hole for a check' });
      }
    });
  }
  const on = doc.on ?? doc.true;
  if (on && typeof on === 'object' && !Array.isArray(on)) {
    out.triggers = Object.keys(on);
    for (const ev of ['push', 'pull_request']) {
      const t = on[ev];
      if (t && typeof t === 'object') {
        if (t.paths) out.findings.push({ kind: 'path_filter', event: ev, paths: t.paths, note: 'runs only when these change; compare with how often it runs (ci-runs.js path_filter_use)' });
        if (t['paths-ignore']) out.findings.push({ kind: 'path_filter', event: ev, ignore: t['paths-ignore'], note: 'skips when only these change' });
      }
    }
  } else out.triggers = [].concat(on || []);
  out.commands = commandsIn(steps(doc));
  return out;
}

const stepLabel = (st, i = 0) => st.name || st.uses || (typeof st.run === 'string' ? st.run.split('\n')[0].slice(0, 60) : `step ${i + 1}`);
const INSTALL_RUN = /\b(?:npm ci|npm install|pnpm install|yarn install|bun install|pip install|bundle install|go mod download)\b/;

/** Is this step a checkout, a setup-* action or a dependency install: the part of a job a runner pays for first. */
function isSetupStep(st) {
  if (!st || typeof st !== 'object') return false;
  if (typeof st.uses === 'string' && /^actions\/(checkout|setup-[\w-]+)(@|$)/.test(st.uses)) return true;
  return typeof st.run === 'string' && INSTALL_RUN.test(st.run);
}

/**
 * Steps that decide whether the rest of the job runs: a step with an `id` whose output a later step's `if:` reads,
 * placed after a checkout, setup or install step. The job paid for a runner and its setup before it chose to skip.
 * Returns [{ step_id, after }], `after` being the last setup step before the deciding step.
 */
function lateSkips(steps) {
  const out = [];
  steps.forEach((st, i) => {
    if (!st || typeof st !== 'object' || !st.id) return;
    // A cache restore gates an install on `cache-hit`; that is a cache check, not a decision to skip the job.
    if (typeof st.uses === 'string' && /^actions\/cache(\/restore)?@/.test(st.uses)) return;
    const id = String(st.id);
    const used = steps.slice(i + 1).some((later) => later && typeof later.if === 'string' && later.if.includes(`steps.${id}.outputs`));
    if (!used) return;
    let setup = null;
    for (let j = 0; j < i; j++) if (isSetupStep(steps[j])) setup = stepLabel(steps[j], j);
    if (setup) out.push({ step_id: id, after: setup });
  });
  return out;
}

/** Does a job check out with `fetch-depth: 0` and no `filter:` input (full history, every blob)? */
function fullHistoryCheckout(steps) {
  return steps.some((st) => st && typeof st.uses === 'string' && /^actions\/checkout(@|$)/.test(st.uses)
    && st.with && typeof st.with === 'object' && String(st.with['fetch-depth']) === '0' && !st.with.filter);
}

const SOURCE_EXT = ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'py', 'go', 'rs', 'swift', 'kt', 'java', 'rb', 'php', 'cs'];
const SOURCE_RE = new RegExp(`\\.(?:${SOURCE_EXT.join('|')})$`);
const SKIP_DIRS = /(^|\/)(node_modules|vendor|dist|build)\//;
const TEST_FILE = /(\.test\.[^/]+|\.spec\.[^/]+|_test\.go|(^|\/)test_[^/]+\.py|_test\.py|Tests\.swift|Test\.kt|Test\.java|_spec\.rb)$/;
const TEST_DIR = /(^|\/)(__tests__|tests|test|spec)\//;
/** Is this path a test file, in any of the common languages? */
function isTestPath(p) {
  return TEST_FILE.test(p) || TEST_DIR.test(p);
}
/** A source file that is not a test, not vendored or built, not a type declaration, not generated. */
function isCodePath(p) {
  return SOURCE_RE.test(p) && !isTestPath(p) && !SKIP_DIRS.test(p) && !/\.d\.ts$/.test(p) && !/\.(generated|pb)\./.test(p);
}
/** A counted test file: a test path with a source extension, not vendored or built (fixtures and snapshots do not count). */
const isCountedTest = (p) => SOURCE_RE.test(p) && isTestPath(p) && !SKIP_DIRS.test(p);

const FILE_CAP = 20000;

/** Size of the suite from every path in the tree and a Map of path to non-blank lines (null when lines were not counted). */
function sizeOf(paths, lines) {
  const tests = paths.filter(isCountedTest);
  const code = paths.filter(isCodePath);
  const total = (xs) => xs.reduce((a, p) => a + (lines.get(p) || 0), 0);
  const out = { test_files: tests.length, test_lines: lines ? total(tests) : null, code_lines: lines ? total(code) : null, test_share: null };
  if (lines && out.test_lines + out.code_lines > 0) out.test_share = Math.round((out.test_lines / (out.test_lines + out.code_lines)) * 1000) / 1000;
  return out;
}

/** Growth of the test suite: `now` and `start` are sizeOf results (start may be null). */
function testGrowth(now, start) {
  const d = (k) => (now[k] == null || start[k] == null ? null : now[k] - start[k]);
  return { now, start: start || null, delta: start ? { test_files: d('test_files'), test_lines: d('test_lines'), code_lines: d('code_lines') } : null };
}

/** Parse `git grep -c` output taken at `commit` into a Map of path to count. */
function parseGrepCounts(text, commit) {
  const m = new Map();
  for (const l of text.split('\n')) {
    if (!l.startsWith(`${commit}:`)) continue;
    const rest = l.slice(commit.length + 1);
    const i = rest.lastIndexOf(':');
    if (i > 0) m.set(rest.slice(0, i), Number(rest.slice(i + 1)));
  }
  return m;
}

/** Measure the tree at one commit with two git processes. Lines are skipped above `cap` source files. */
function measureTree(git, commit, cap = FILE_CAP) {
  const paths = git(['ls-tree', '-r', '--name-only', commit]).split('\n').filter(Boolean);
  if (paths.filter((p) => isCountedTest(p) || isCodePath(p)).length > cap) return { ...sizeOf(paths, null), skipped_lines: `more than ${cap} source files` };
  const grep = git(['grep', '-c', '-I', '-v', '-e', '^[[:space:]]*$', commit, '--', ...SOURCE_EXT.map((e) => `*.${e}`)]);
  return sizeOf(paths, parseGrepCounts(grep, commit));
}

/** Test growth on `ref`: now at its head, start at the last commit before `startIso` (null when there is none). */
function measureGrowth(git, ref, startIso, cap = FILE_CAP) {
  const head = git(['rev-parse', ref]).trim();
  const now = measureTree(git, head, cap);
  let startSha = '';
  try { startSha = git(['rev-list', '-1', `--before=${startIso}`, ref]).trim(); } catch { /* no history that old */ }
  return testGrowth(now, startSha ? measureTree(git, startSha, cap) : null);
}

const pct = (x) => (x == null ? '?' : `${Math.round(x * 1000) / 10}`);
const signed = (n) => (n == null ? '?' : `${n >= 0 ? '+' : ''}${n}`);
/** The one printed line for a testGrowth result. */
function growthLine(g) {
  const { now, start, delta } = g;
  const part = (v, tail = '') => (delta ? ` (${signed(v)}${tail})` : '');
  if (now.test_lines == null) return `test growth: ${now.test_files} test files${part(delta && delta.test_files, ' in the window')}; lines not counted (${now.skipped_lines})`;
  return `test growth: ${now.test_files} test files${part(delta && delta.test_files, ' in the window')}, ${now.test_lines} test lines${part(delta && delta.test_lines)}, ${pct(now.test_share)}% of test+code lines${start ? ` (was ${pct(start.test_share)}%)` : ''}; code ${delta ? signed(delta.code_lines) : now.code_lines} lines`;
}

const steps = (doc) => Object.values(doc.jobs || {}).flatMap((j) => (j && Array.isArray(j.steps) ? j.steps : []));

/** Tool commands a script or step runs: npm/pnpm/yarn scripts, npx tools and common checkers, normalised. */
function commandsIn(stepsOrText) {
  const text = Array.isArray(stepsOrText) ? stepsOrText.map((s) => (s && typeof s.run === 'string' ? s.run : '')).join('\n') : String(stepsOrText);
  const found = new Set();
  for (const m of text.matchAll(/\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+|-s\s+|--silent\s+)*([\w:.-]+)/g)) {
    if (!['ci', 'install', 'i', 'exec', 'run', 'x', 'add'].includes(m[1])) found.add(`script:${m[1]}`);
  }
  for (const m of text.matchAll(/\b(?:npx|pnpm exec|yarn exec|bunx)\s+(?:--\S+\s+)*([\w@/.-]+)/g)) found.add(`tool:${m[1].replace(/@[\d^~.]+$/, '')}`);
  for (const m of text.matchAll(/(?:^|[\s;&|(])(eslint|tsc|jest|vitest|prettier|biome|ruff|mypy|pytest|black|flake8|golangci-lint|swiftlint|ktlint|rubocop|gitleaks|lint-staged)\b/g)) found.add(`tool:${m[1]}`);
  if (/\bgo test\b/.test(text)) found.add('tool:go test');
  if (/\bcargo (test|clippy)\b/.test(text)) found.add('tool:cargo');
  return [...found].sort();
}

// Test runners a gate may call, and the flags that make one run only the tests a change can reach.
const TEST_RUNNERS = [
  ['jest', /\bjest\b/], ['vitest', /\bvitest\b/], ['bun test', /\bbun test\b/], ['node --test', /\bnode\s+(?:--\S+\s+)*--test\b/],
  ['mocha', /\bmocha\b/], ['pytest', /\bpytest\b/], ['go test', /\bgo test\b/], ['cargo test', /\bcargo (?:nextest|test)\b/],
  ['rspec', /\brspec\b/], ['phpunit', /\bphpunit\b/], ['dotnet test', /\bdotnet test\b/], ['gradle test', /\bgradlew?\b[^\n]*\btest\b/],
  ['xcodebuild test', /\bxcodebuild\b[^\n]*\btest\b/], ['swift test', /\bswift test\b/],
];
const SCOPE_FLAGS = [
  ['--changedSince', /--changedSince\b/], ['--onlyChanged', /--onlyChanged\b/], ['--findRelatedTests', /--findRelatedTests\b/],
  ['--changed', /--changed\b(?!Since)/], ['vitest related', /\bvitest related\b/], ['--testmon', /--testmon\b/], ['--picked', /--picked\b/],
  ['affected', /\b(?:nx affected|--affected)\b/], ['turbo filter', /--filter=\S*\.\.\.\[/],
];

/**
 * Which test runners the gate's text calls, and whether any run is scoped to the change. `texts` are hook bodies and
 * the package scripts they reach; shell comments are dropped, so a sentence about a flag does not count as using it.
 */
function testScopeIn(texts) {
  const body = texts.map((t) => String(t).split('\n').map((l) => l.replace(/(^|\s)#.*$/, '')).join('\n')).join('\n');
  const runners = TEST_RUNNERS.filter(([, re]) => re.test(body)).map(([n]) => n);
  // A wrapper script (`npm run test:ci` that starts its own runner) still counts as the gate's tests.
  if (!runners.length) for (const m of body.matchAll(/\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(test[\w:.-]*)/g)) if (!runners.includes(`script ${m[1]}`)) runners.push(`script ${m[1]}`);
  return {
    runners,
    scoped: SCOPE_FLAGS.filter(([, re]) => re.test(body)).map(([n]) => n),
  };
}

/** Expand `script:x` through package.json scripts (three levels), so `npm run validate` shows the tools it runs. */
function expand(commands, scripts = {}) {
  const out = new Set(commands);
  let frontier = commands;
  for (let depth = 0; depth < 3; depth++) {
    const next = [];
    for (const c of frontier) {
      if (!c.startsWith('script:')) continue;
      const body = scripts[c.slice(7)];
      if (!body) continue;
      for (const x of commandsIn(body)) if (!out.has(x)) { out.add(x); next.push(x); }
      for (const pre of ['pre', 'post']) {
        const p = scripts[`${pre}${c.slice(7)}`];
        if (p) for (const x of commandsIn(p)) if (!out.has(x)) { out.add(x); next.push(x); }
      }
    }
    frontier = next;
  }
  return [...out].sort();
}

/** Where git runs hooks from, and what is there. `git` runs a git command in the repo. */
function checkHooks(root, git) {
  const hooksPath = (() => { try { return git(['config', '--get', 'core.hooksPath']).trim() || null; } catch { return null; } })();
  const dir = path.resolve(root, git(['rev-parse', '--git-path', 'hooks']).trim());
  const hooks = [];
  if (fs.existsSync(dir)) {
    for (const n of fs.readdirSync(dir)) {
      if (n.endsWith('.sample') || !HOOK_NAMES.includes(n)) continue;
      const p = path.join(dir, n);
      const st = fs.statSync(p);
      const body = fs.readFileSync(p, 'utf8');
      hooks.push({ name: n, executable: Boolean(st.mode & 0o111), lines: body.split('\n').length, commands: commandsIn(body), manager: managerIn(body) });
    }
  }
  const has = (p) => fs.existsSync(path.join(root, p));
  const pkg = has('package.json') ? JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) : {};
  const managers = [];
  if (has('.husky')) managers.push({ name: 'husky', config: '.husky/', installed: Boolean(hooksPath && /\.husky/.test(hooksPath)), hooks: fs.readdirSync(path.join(root, '.husky')).filter((n) => HOOK_NAMES.includes(n)) });
  if (has('lefthook.yml') || has('lefthook.yaml') || has('.lefthook.yml')) managers.push({ name: 'lefthook', config: 'lefthook.yml', installed: hooks.some((h) => h.manager === 'lefthook') });
  if (has('.pre-commit-config.yaml')) managers.push({ name: 'pre-commit', config: '.pre-commit-config.yaml', installed: hooks.some((h) => h.manager === 'pre-commit') });
  if (pkg['simple-git-hooks']) managers.push({ name: 'simple-git-hooks', config: 'package.json', installed: hooks.some((h) => h.manager === 'simple-git-hooks') });
  const tracked = hooksPath && !path.isAbsolute(hooksPath) && has(hooksPath) ? hooksPath : null;
  if (tracked && !managers.length) {
    managers.push({ name: 'core.hooksPath', config: tracked, installed: true, hooks: fs.readdirSync(path.join(root, tracked)).filter((n) => HOOK_NAMES.includes(n)) });
  }
  // A tracked hook folder nobody pointed git at.
  const unused = ['.githooks', 'githooks', '.hooks', 'scripts/hooks', 'scripts/git-hooks'].filter((d) => has(d) && d !== hooksPath && fs.readdirSync(path.join(root, d)).some((n) => HOOK_NAMES.includes(n)));
  return { hooks_dir: path.relative(root, dir) || dir, core_hooks_path: hooksPath, hooks, managers, tracked_but_not_used: unused, scripts: pkg.scripts || {} };
}

function managerIn(body) {
  if (/lefthook/.test(body)) return 'lefthook';
  if (/pre-commit\.com|pre_commit/.test(body)) return 'pre-commit';
  if (/husky/.test(body)) return 'husky';
  if (/simple-git-hooks/.test(body)) return 'simple-git-hooks';
  return null;
}

/** A short hash of a hook folder's files and the agent hooks in `.claude/settings.json`, for one worktree. */
function hookPrint(dir, hooksDir) {
  const h = (parts) => (parts.length ? crypto.createHash('sha1').update(parts.join('\0')).digest('hex').slice(0, 8) : null);
  const d = hooksDir && path.join(dir, hooksDir);
  const git = d && fs.existsSync(d) ? fs.readdirSync(d).sort().map((n) => { try { return `${n}\n${fs.readFileSync(path.join(d, n), 'utf8')}`; } catch { return n; } }) : [];
  let agent = [];
  try { agent = [JSON.stringify(JSON.parse(fs.readFileSync(path.join(dir, '.claude', 'settings.json'), 'utf8')).hooks || {})]; } catch { /* no settings */ }
  return { git_hooks: h(git), agent_hooks: h(agent) };
}

/** Worktrees whose hooks differ from the reference worktree's. entries: [{ path, branch, git_hooks, agent_hooks }]. */
function hookDrift(entries, refPath) {
  const ref = entries.find((e) => e.path === refPath);
  if (!ref) return [];
  return entries.filter((e) => e !== ref).map((e) => ({
    ...e, git_differs: e.git_hooks !== ref.git_hooks, agent_differs: e.agent_hooks !== ref.agent_hooks,
  })).filter((e) => e.git_differs || e.agent_differs);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = repoRoot();
  if (!root) throw new Error('run this inside a git repo');
  const git = (a) => run('git', a, { cwd: root });
  const wfDir = path.join(root, '.github', 'workflows');
  const workflows = fs.existsSync(wfDir)
    ? fs.readdirSync(wfDir).filter((n) => /\.ya?ml$/.test(n)).map((n) => {
      try { return checkWorkflow(`.github/workflows/${n}`, fs.readFileSync(path.join(wfDir, n), 'utf8')); } catch (e) { return { file: `.github/workflows/${n}`, error: e.message, findings: [], jobs: [], commands: [] }; }
    })
    : [];
  const hooks = checkHooks(root, git);
  const branch = args.branch || loadConfig(args).mainBranch || 'main';
  let remote = null;
  try { remote = git(['ls-tree', '--name-only', `origin/${branch}`, '.github/workflows/']).split('\n').filter(Boolean); } catch { /* no remote branch */ }
  const notPushed = remote ? workflows.map((w) => w.file).filter((f) => !remote.includes(f)) : [];
  const removedLocally = remote ? remote.filter((f) => /\.ya?ml$/.test(f) && !workflows.some((w) => w.file === f)) : [];
  const ciTools = expand([...new Set(workflows.flatMap((w) => w.commands))], hooks.scripts);
  const hookBodies = hooks.hooks.flatMap((h) => h.commands);
  for (const m of hooks.managers) {
    if (m.name === 'husky') for (const n of m.hooks || []) hookBodies.push(...commandsIn(fs.readFileSync(path.join(root, '.husky', n), 'utf8')));
    if (m.name === 'lefthook') hookBodies.push(...commandsIn(fs.readFileSync(path.join(root, m.config), 'utf8')));
    if (m.name === 'core.hooksPath') for (const n of m.hooks || []) hookBodies.push(...commandsIn(fs.readFileSync(path.join(root, m.config, n), 'utf8')));
  }
  const hookTools = expand([...new Set(hookBodies)], hooks.scripts);
  const hookTexts = [];
  const readText = (p) => { try { hookTexts.push(fs.readFileSync(p, 'utf8')); } catch { /* gone */ } };
  for (const h of hooks.hooks) readText(path.resolve(root, hooks.hooks_dir, h.name));
  for (const m of hooks.managers) {
    if (m.name === 'husky') for (const n of m.hooks || []) readText(path.join(root, '.husky', n));
    if (m.name === 'lefthook') readText(path.join(root, m.config));
  }
  for (const t of hookTools) if (t.startsWith('script:') && hooks.scripts && hooks.scripts[t.slice(7)]) hookTexts.push(hooks.scripts[t.slice(7)]);
  const gateTests = testScopeIn(hookTexts);

  const head = git(['log', '-1', '--format=%h %cs']).trim();
  let since = [];
  if (args.to || args.days || args.from) {
    const win = windowFrom(args);
    const paths = ['.github/workflows', '.husky', 'lefthook.yml', '.claude/settings.json', ...(hooks.core_hooks_path && !path.isAbsolute(hooks.core_hooks_path) ? [hooks.core_hooks_path] : [])];
    try { since = git(['log', '--format=%h %cs %s', `--since=${win.endIso}`, `origin/${branch}`, '--', ...paths]).split('\n').filter(Boolean); } catch { /* no remote */ }
  }
  let worktrees = [];
  try {
    worktrees = git(['worktree', 'list', '--porcelain']).split('\n\n').map((b) => ({
      path: (/^worktree (.+)$/m.exec(b) || [])[1], branch: ((/^branch refs\/heads\/(.+)$/m.exec(b) || [])[1]) || 'detached',
    })).filter((w) => w.path && fs.existsSync(w.path));
  } catch { /* no worktrees */ }
  const tracked = hooks.core_hooks_path && !path.isAbsolute(hooks.core_hooks_path) ? hooks.core_hooks_path : null;
  const refPath = (worktrees.find((w) => w.branch === branch) || { path: root }).path;
  const drift = worktrees.length > 1 ? hookDrift(worktrees.map((w) => ({ ...w, ...hookPrint(w.path, tracked) })), refPath) : [];

  let growth = null;
  try { growth = measureGrowth(git, `origin/${branch}`, windowFrom(args).startIso); } catch { /* no remote branch */ }

  const out = {
    branch,
    read_at: head,
    test_growth: growth,
    late_skips: workflows.flatMap((w) => w.late_skips || []),
    full_history_checkouts: workflows.flatMap((w) => w.full_history_checkouts || []),
    changed_since_window_end: since,
    hook_drift: drift,
    not_on_remote: notPushed,
    removed_locally: removedLocally,
    workflows,
    hooks: { ...hooks, scripts: undefined },
    gate_tests: gateTests,
    compare: {
      ci: ciTools,
      hooks: hookTools,
      in_ci_not_hooks: ciTools.filter((x) => !hookTools.includes(x)),
      in_hooks_not_ci: hookTools.filter((x) => !ciTools.includes(x)),
    },
  };
  if (args.out) fs.writeFileSync(String(args.out), JSON.stringify(out, null, 1));
  const lines = [`Files read as they are now (HEAD ${head}).`];
  if (since.length) lines.push(`Changed on origin/${branch} since the window end (a finding these fix is "fixed since"):`, ...since.map((l) => `  ${l}`));
  lines.push('', '# Workflows');
  if (remote === null) lines.push(`origin/${branch} not found: cannot tell which workflow files GitHub has`);
  if (notPushed.length) lines.push(`NOT ON origin/${branch} (GitHub does not run them yet): ${notPushed.join(', ')}`);
  if (removedLocally.length) lines.push(`on origin/${branch} but not in this checkout: ${removedLocally.join(', ')}`);
  for (const w of workflows) {
    lines.push(`${w.file} (${w.name}) triggers ${JSON.stringify(w.triggers)} jobs ${w.jobs.map((j) => `${j.id}${j.timeout ? `[${j.timeout}m]` : ''}`).join(', ')}`);
    for (const f of w.findings) lines.push(`  ${f.kind}${f.job ? ` ${f.job}` : ''}${f.step ? ` / ${f.step}` : ''}${f.line ? ` (line ${f.line})` : ''}${f.text ? ` \`${f.text}\`` : ''}: ${f.note}${f.paths ? ` ${JSON.stringify(f.paths)}` : ''}${f.ignore ? ` ${JSON.stringify(f.ignore)}` : ''}`);
    for (const l of w.late_skips || []) lines.push(`  late skip: ${l.file} job ${l.job} decides at step ${l.step_id} after ${l.after}; a job-level if: would not start a runner`);
    for (const f of w.full_history_checkouts || []) lines.push(`  full history checkout: ${f.file} job ${f.job} (fetch-depth: 0 with no filter: blob:none)`);
    if (w.error) lines.push(`  could not read: ${w.error}`);
  }
  lines.push('', '# Tests', growth ? growthLine(growth) : `test growth: not measured (origin/${branch} not found)`);
  lines.push('', '# Hooks', `git runs hooks from ${out.hooks.hooks_dir}${hooks.core_hooks_path ? ` (core.hooksPath ${hooks.core_hooks_path})` : ''}`);
  for (const h of hooks.hooks) lines.push(`  ${h.name}${h.executable ? '' : ' (NOT executable: git skips it)'}${h.manager ? ` via ${h.manager}` : ''}: ${h.commands.join(' ') || 'no known tools'}`);
  if (!hooks.hooks.length) lines.push('  no active hooks');
  lines.push(gateTests.runners.length
    ? `  tests in the gate: ${gateTests.runners.join(', ')}; ${gateTests.scoped.length ? `scoped to the change (${gateTests.scoped.join(', ')})` : 'every test on every push (no diff-scoped flag)'}`
    : '  tests in the gate: no test runner seen');
  for (const m of hooks.managers) lines.push(`  manager ${m.name} (${m.config}): ${m.installed ? 'installed' : 'NOT installed in this clone'}`);
  if (hooks.tracked_but_not_used.length) lines.push(`  hook folders git does not use: ${hooks.tracked_but_not_used.join(', ')}`);
  if (worktrees.length > 1) {
    lines.push(`worktrees: ${worktrees.length}; with hooks that differ from ${branch}'s (each runs its own branch's copy): ${drift.length}`);
    for (const d of drift) lines.push(`  ${d.path} (${d.branch}):${d.git_differs ? ' git hooks' : ''}${d.agent_differs ? ' agent hooks' : ''}`);
  }
  lines.push('', '# CI against hooks', `CI runs: ${out.compare.ci.join(' ') || 'nothing known'}`, `hooks run: ${out.compare.hooks.join(' ') || 'nothing known'}`,
    `in CI only: ${out.compare.in_ci_not_hooks.join(' ') || 'none'}`, `in hooks only: ${out.compare.in_hooks_not_ci.join(' ') || 'none'}`);
  console.log(lines.join('\n'));
}

if (require.main === module) {
  try { main(); printElapsed(); } catch (e) { console.error(e.message); printElapsed(); process.exit(1); }
}

module.exports = { hookDrift, checkWorkflow, commandsIn, expand, managerIn, testScopeIn, isTestPath, isCodePath, lateSkips, fullHistoryCheckout, sizeOf, testGrowth, parseGrepCounts, measureTree, measureGrowth, growthLine };
