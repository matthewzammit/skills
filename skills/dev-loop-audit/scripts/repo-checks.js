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
 * The files are read as they are now. With a window (--to), the commits since its end that changed workflows or
 * hooks are listed, so a finding the repo has already fixed is reported as "fixed since".
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { parseArgs, run, repoRoot, parseYaml, loadConfig, windowFrom } = require('./common.js');

const HOOK_NAMES = ['pre-commit', 'commit-msg', 'pre-push', 'prepare-commit-msg', 'post-checkout', 'post-merge', 'pre-rebase'];

/** Findings for one workflow file. `text` is its contents. */
function checkWorkflow(file, text) {
  const doc = parseYaml(text);
  const lines = text.split('\n');
  const lineOf = (re, from = 0) => {
    for (let i = from; i < lines.length; i++) if (re.test(lines[i])) return i + 1;
    return null;
  };
  const out = { file, name: doc.name || path.basename(file), jobs: [], findings: [] };
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

  const out = {
    branch,
    read_at: head,
    changed_since_window_end: since,
    hook_drift: drift,
    not_on_remote: notPushed,
    removed_locally: removedLocally,
    workflows,
    hooks: { ...hooks, scripts: undefined },
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
    if (w.error) lines.push(`  could not read: ${w.error}`);
  }
  lines.push('', '# Hooks', `git runs hooks from ${out.hooks.hooks_dir}${hooks.core_hooks_path ? ` (core.hooksPath ${hooks.core_hooks_path})` : ''}`);
  for (const h of hooks.hooks) lines.push(`  ${h.name}${h.executable ? '' : ' (NOT executable: git skips it)'}${h.manager ? ` via ${h.manager}` : ''}: ${h.commands.join(' ') || 'no known tools'}`);
  if (!hooks.hooks.length) lines.push('  no active hooks');
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
  try { main(); } catch (e) { console.error(e.message); process.exit(1); }
}

module.exports = { hookDrift, checkWorkflow, commandsIn, expand, managerIn };
