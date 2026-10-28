#!/usr/bin/env node
/**
 * GitHub Actions for one window: every run, its jobs and steps, failures, flakes, billed minutes, the slowest job
 * chain, and holes (code on the main branch with no passing CI run). Reads only: it calls `gh api` and `git`.
 *
 *   node ci-runs.js --out ci.json                         last week, the repo in the working directory
 *   node ci-runs.js --from 2026-10-19 --to 2026-10-26 --out ci.json
 *   options: --repo owner/name  --branch main  --workflows "CI,Tests"  --config <file>  --no-fetch  --no-jobs
 *
 * The rules (references/checks-ci.md):
 * - Runs are fetched one day at a time (the runs API returns at most 1,000 per query), after a rate-limit check.
 * - Speed counts successful runs only: median, p90, and queue wait (job start minus job created).
 * - A flake is a run that went green on a later attempt, or a failed run on a commit whose later run of the same
 *   workflow passed.
 * - Billed minutes are an estimate: each job rounded up to a whole minute, times 2 on Windows and 10 on macOS,
 *   0 on self-hosted runners. Public repos pay nothing for standard runners.
 * - Holes: the main branch's first-parent commits are grouped by push (a push ends at a commit that has runs).
 *   A group that changed files CI watches is a hole when CI did not pass on it and did not pass on the next push
 *   within an hour either.
 */
const fs = require('node:fs');
const path = require('node:path');
const { parseArgs, windowFrom, loadConfig, run, repoRoot, median, p90, round, sum, ms, parseYaml, globToRegex } = require('./common.js');

const RUN_FIELDS = '{id, name, path, event, head_branch, head_sha, status, conclusion, run_attempt, created_at, run_started_at, updated_at, display_title, html_url}';
const JOB_FIELDS = '{id, name, status, conclusion, created_at, started_at, completed_at, labels, run_attempt, steps: [.steps[]? | {name, conclusion, started_at, completed_at}]}';
const NOT_CI = /announce|release|deploy|publish|pages|label|stale|notify|slack|tag|dependabot|codeql|greet|welcome|triage/i;
const FAILED = new Set(['failure', 'timed_out', 'startup_failure']);

/** UTC dates (YYYY-MM-DD) that cover [start, end), plus `extraDays` after. */
function utcDays(win, extraDays = 0) {
  const out = [];
  const d = new Date(Date.UTC(win.start.getUTCFullYear(), win.start.getUTCMonth(), win.start.getUTCDate()));
  const stop = ms(win.endIso) + extraDays * 86400000;
  while (d.getTime() < stop) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

const dur = (a, b) => (a && b ? (ms(b) - ms(a)) / 1000 : null);

/** Billing multiplier for a job's runner labels. */
function rateFor(labels = []) {
  const l = labels.join(' ').toLowerCase();
  if (/self-hosted/.test(l)) return 0;
  if (/macos|mac-/.test(l)) return 10;
  if (/windows/.test(l)) return 2;
  return 1;
}
function billedMinutes(job) {
  const s = dur(job.started_at, job.completed_at);
  if (!s || s <= 0 || job.conclusion === 'skipped') return 0;
  return Math.ceil(s / 60) * rateFor(job.labels);
}

/** Wall time of a run from its jobs: first job start to last job end. */
function runWall(jobs) {
  const ran = jobs.filter((j) => j.started_at && j.completed_at && j.conclusion !== 'skipped');
  if (!ran.length) return null;
  return (Math.max(...ran.map((j) => ms(j.completed_at))) - Math.min(...ran.map((j) => ms(j.started_at)))) / 1000;
}

/**
 * The longest chain of jobs in one run, read from timings: start at the job that ended last, then step back to
 * the job that ended closest before it started (within 2 minutes), and so on.
 */
function criticalPath(jobs) {
  const ran = jobs.filter((j) => j.started_at && j.completed_at && j.conclusion !== 'skipped');
  if (!ran.length) return [];
  let cur = ran.reduce((a, b) => (ms(b.completed_at) > ms(a.completed_at) ? b : a));
  const chain = [cur];
  for (;;) {
    const start = ms(cur.started_at);
    const before = ran.filter((j) => !chain.includes(j) && ms(j.completed_at) <= start + 5000 && start - ms(j.completed_at) < 120000);
    if (!before.length) break;
    cur = before.reduce((a, b) => (ms(b.completed_at) > ms(a.completed_at) ? b : a));
    chain.unshift(cur);
  }
  return chain.map((j) => j.name);
}

/** Speed per workflow and job, from successful runs only. */
function summarizeJobs(runs) {
  const out = {};
  for (const r of runs) {
    if (r.conclusion !== 'success' || !r.jobs) continue;
    const w = out[r.name] || (out[r.name] = { runs: 0, walls: [], jobs: {}, chains: {} });
    w.runs++;
    const wall = runWall(r.jobs);
    if (wall != null) w.walls.push(wall);
    const chain = criticalPath(r.jobs).join(' > ');
    if (chain) w.chains[chain] = (w.chains[chain] || 0) + 1;
    for (const j of r.jobs) {
      if (j.conclusion !== 'success') continue;
      const e = w.jobs[j.name] || (w.jobs[j.name] = { n: 0, durs: [], queues: [], steps: {} });
      e.n++;
      e.durs.push(dur(j.started_at, j.completed_at));
      const q = dur(j.created_at, j.started_at);
      if (q != null && q >= 0) e.queues.push(q);
      for (const st of j.steps || []) {
        if (st.conclusion !== 'success') continue;
        const d = dur(st.started_at, st.completed_at);
        if (d == null) continue;
        (e.steps[st.name] || (e.steps[st.name] = [])).push(d);
      }
    }
  }
  const result = {};
  for (const [name, w] of Object.entries(out)) {
    result[name] = {
      successful_runs: w.runs,
      wall_median_s: median(w.walls),
      wall_p90_s: p90(w.walls),
      longest_chain: Object.entries(w.chains).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
      jobs: Object.fromEntries(Object.entries(w.jobs).map(([jn, e]) => [jn, {
        n: e.n, median_s: median(e.durs), p90_s: p90(e.durs), max_s: round(Math.max(...e.durs), 1), queue_median_s: median(e.queues),
        steps: Object.fromEntries(Object.entries(e.steps).map(([sn, xs]) => [sn, { median_s: median(xs), p90_s: p90(xs) }])
          .sort((a, b) => b[1].median_s - a[1].median_s).slice(0, 8)),
      }])),
    };
  }
  return result;
}

/**
 * Flakes: a run that passed on attempt 2 or later after a failed attempt, or a failed run whose commit later passed
 * in the same workflow. `priorConclusions` maps run id to the previous attempt's conclusion.
 */
function findFlakes(runs, priorConclusions = {}) {
  const flakes = [];
  for (const r of runs) {
    if (r.run_attempt > 1 && r.conclusion === 'success' && FAILED.has(priorConclusions[r.id])) {
      flakes.push({ kind: 'rerun', workflow: r.name, sha: r.head_sha.slice(0, 8), run: r.id, attempt: r.run_attempt, branch: r.head_branch });
    }
  }
  const bySha = new Map();
  for (const r of runs) {
    const k = `${r.name}\u0000${r.head_sha}`;
    if (!bySha.has(k)) bySha.set(k, []);
    bySha.get(k).push(r);
  }
  for (const rs of bySha.values()) {
    rs.sort((a, b) => ms(a.created_at) - ms(b.created_at));
    const failed = rs.find((r) => FAILED.has(r.conclusion));
    const passedLater = failed && rs.find((r) => r.conclusion === 'success' && ms(r.created_at) > ms(failed.created_at));
    if (passedLater) flakes.push({ kind: 'new run', workflow: failed.name, sha: failed.head_sha.slice(0, 8), run: failed.id, passed_run: passedLater.id, branch: failed.head_branch });
  }
  return flakes;
}

/** Path filters of a workflow's push trigger: { paths: [RegExp] | null, ignore: [RegExp] | null, branches }. */
function pushFilters(yamlText) {
  const doc = parseYaml(yamlText);
  const on = doc.on ?? doc.true ?? null;
  if (on === null || typeof on === 'string' || Array.isArray(on)) return { triggers: [].concat(on || []), paths: null, ignore: null };
  const push = on.push;
  const toRe = (xs) => (Array.isArray(xs) ? xs.map((g) => ({ neg: String(g).startsWith('!'), re: globToRegex(String(g).replace(/^!/, '')) })) : null);
  return {
    triggers: Object.keys(on),
    branches: push && push.branches ? [].concat(push.branches) : null,
    paths: push && push.paths ? toRe(push.paths) : null,
    ignore: push && push['paths-ignore'] ? toRe(push['paths-ignore']) : null,
  };
}

/** Would this file trigger the workflow? GitHub reads `paths` patterns in order; a later `!pattern` excludes. */
function fileTriggers(file, f) {
  if (!f) return true;
  if (f.paths) {
    let hit = false;
    for (const p of f.paths) if (p.re.test(file)) hit = !p.neg;
    return hit;
  }
  if (f.ignore) {
    let ignored = false;
    for (const p of f.ignore) if (p.re.test(file)) ignored = !p.neg;
    return !ignored;
  }
  return true;
}

/** The CI status of a commit from its runs of the CI workflows. */
function statusOf(runs) {
  if (!runs.length) return 'no_run';
  if (runs.some((r) => r.conclusion === 'success')) return 'passed';
  if (runs.every((r) => r.conclusion === 'skipped')) return 'skipped';
  if (runs.some((r) => r.status !== 'completed')) return 'running';
  const latest = runs.filter((r) => r.conclusion !== 'skipped').sort((a, b) => ms(b.created_at) - ms(a.created_at))[0];
  return latest.conclusion;
}

/**
 * Group first-parent commits (oldest first) by push and decide which groups are holes.
 * commits: [{ sha, date, subject, files: [..] }]; runs: push runs on the branch (every workflow);
 * ciNames: the workflows that check code; filters: { [workflow name]: pushFilters result }.
 */
function findHoles(commits, runs, ciNames, filters = {}) {
  const pushRuns = runs.filter((r) => r.event === 'push');
  const tips = new Set(pushRuns.map((r) => r.head_sha));
  const groups = [];
  let cur = [];
  for (const c of commits) {
    cur.push(c);
    if (tips.has(c.sha)) { groups.push({ commits: cur, tip: c.sha }); cur = []; }
  }
  if (cur.length) groups.push({ commits: cur, tip: cur[cur.length - 1].sha, unpushed_run: true });
  for (const g of groups) {
    const ciRuns = pushRuns.filter((r) => r.head_sha === g.tip && ciNames.includes(r.name));
    // No CI workflow at all: every push is unchecked.
    g.status = ciNames.length ? statusOf(ciRuns) : 'no_ci';
    const files = [...new Set(g.commits.flatMap((c) => c.files || []))];
    const watched = ciNames.length ? files.filter((f) => ciNames.some((n) => fileTriggers(f, filters[n]))) : files;
    g.files = files.length;
    g.watched_files = watched.length;
    g.watched_sample = watched.slice(0, 5);
    const pass = ciRuns.filter((r) => r.conclusion === 'success').sort((a, b) => ms(a.created_at) - ms(b.created_at))[0];
    g.passed_at = pass ? pass.created_at : null;
    g.pushed_at = (pushRuns.filter((r) => r.head_sha === g.tip).sort((a, b) => ms(a.created_at) - ms(b.created_at))[0] || {}).created_at || g.commits[g.commits.length - 1].date;
    g.runs = ciRuns.map((r) => ({ id: r.id, workflow: r.name, conclusion: r.conclusion || r.status }));
  }
  groups.forEach((g, i) => {
    g.hole = false;
    // A skip is the workflow's own `if:` choosing not to check; it is listed apart, and the agent reads the condition.
    if (['passed', 'running', 'skipped'].includes(g.status) || g.watched_files === 0) return;
    const next = groups.slice(i + 1).find((n) => n.status !== 'skipped' && n.status !== 'no_run');
    const covered = next && next.status === 'passed' && ms(next.passed_at) - ms(g.pushed_at) <= 3600000;
    if (covered) g.covered_by = next.tip.slice(0, 8);
    else g.hole = true;
  });
  return groups.map((g) => ({
    tip: g.tip.slice(0, 8), commits: g.commits.length, first: g.commits[0].subject.slice(0, 70), pushed_at: g.pushed_at,
    status: g.status, files: g.files, watched_files: g.watched_files, watched_sample: g.watched_sample,
    hole: g.hole, covered_by: g.covered_by || null, unpushed_run: Boolean(g.unpushed_run), runs: g.runs,
  }));
}

/** Pick the workflows that check code: the config's list, or every workflow that ran on a push to the branch
 * except the ones whose name says they announce, release or deploy. */
function pickCiWorkflows(runs, branch, given) {
  if (given && given.length) return given;
  const names = [...new Set(runs.filter((r) => r.event === 'push' && r.head_branch === branch).map((r) => r.name))];
  return names.filter((n) => !NOT_CI.test(n));
}

function summarize(runs, win, ciNames, holes, flakes) {
  const inWin = runs.filter((r) => r.in_window);
  const ci = inWin.filter((r) => ciNames.includes(r.name));
  const ciOk = ci.filter((r) => r.conclusion === 'success' && r.jobs);
  const walls = ciOk.map((r) => runWall(r.jobs)).filter((x) => x != null);
  const queues = ciOk.flatMap((r) => r.jobs.filter((j) => j.conclusion === 'success').map((j) => dur(j.created_at, j.started_at))).filter((x) => x != null && x >= 0);
  const withJobs = inWin.filter((r) => r.jobs);
  const billed = sum(withJobs.flatMap((r) => r.jobs.map(billedMinutes)));
  const wasted = sum(withJobs.filter((r) => r.conclusion === 'cancelled' || FAILED.has(r.conclusion)).flatMap((r) => r.jobs.map(billedMinutes)));
  const by = (k) => inWin.reduce((a, r) => { const v = r[k] || r.status; a[v] = (a[v] || 0) + 1; return a; }, {});
  return {
    runs: inWin.length,
    ci_workflows: ciNames,
    ci_runs: ci.length,
    by_conclusion: by('conclusion'),
    by_workflow: inWin.reduce((a, r) => { a[r.name] = (a[r.name] || 0) + 1; return a; }, {}),
    failed: inWin.filter((r) => FAILED.has(r.conclusion)).length,
    cancelled: inWin.filter((r) => r.conclusion === 'cancelled').length,
    flaky: new Set(flakes.map((f) => `${f.workflow}:${f.sha}`)).size,
    holes: holes.filter((h) => h.hole).length,
    skipped_pushes: holes.filter((h) => h.status === 'skipped' && h.watched_files > 0).length,
    main_commits: holes.reduce((a, g) => a + g.commits, 0),
    pushes: holes.length,
    run_median_s: median(walls),
    run_p90_s: p90(walls),
    queue_median_s: median(queues),
    billed_min: billed,
    billed_wasted_min: wasted,
    jobs_fetched: withJobs.length,
  };
}

function ghJsonLines(text) {
  return text.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
}

/** Everything that talks to gh and git, injectable for tests. */
function collect({ repo, branch, win, gh, git, workflowsGiven, withJobs = true, log = () => {} }) {
  const rate = JSON.parse(gh(['api', 'rate_limit', '--jq', '.resources.core']));
  const days = utcDays(win, 1);
  if (rate.remaining < days.length + 50) {
    throw new Error(`GitHub API rate limit too low: ${rate.remaining} left, resets ${new Date(rate.reset * 1000).toISOString()}`);
  }
  const runs = [];
  const seen = new Set();
  for (const day of days) {
    const list = ghJsonLines(gh(['api', '--paginate', '-X', 'GET', `repos/${repo}/actions/runs`, '-f', `created=${day}`, '-f', 'per_page=100', '--jq', `.workflow_runs[] | ${RUN_FIELDS}`]));
    if (list.length >= 1000) log(`warning: ${day} has 1,000 runs or more; the API stops at 1,000, so some are missing`);
    for (const r of list) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      r.in_window = r.created_at >= win.startIso && r.created_at < win.endIso;
      runs.push(r);
    }
  }
  const ciNames = pickCiWorkflows(runs.filter((r) => r.in_window), branch, workflowsGiven);
  const needJobs = runs.filter((r) => r.in_window && r.status === 'completed' && r.conclusion !== 'skipped');
  const after = JSON.parse(gh(['api', 'rate_limit', '--jq', '.resources.core']));
  if (withJobs && after.remaining < needJobs.length + 50) {
    log(`warning: only ${after.remaining} API calls left, so jobs are not fetched (need ${needJobs.length})`);
    withJobs = false;
  }
  if (withJobs) {
    for (const r of needJobs) {
      r.jobs = ghJsonLines(gh(['api', '--paginate', `repos/${repo}/actions/runs/${r.id}/jobs?per_page=100`, '--jq', `.jobs[] | ${JOB_FIELDS}`]));
    }
  }
  const prior = {};
  for (const r of runs.filter((x) => x.in_window && x.run_attempt > 1)) {
    try { prior[r.id] = JSON.parse(gh(['api', `repos/${repo}/actions/runs/${r.id}/attempts/${r.run_attempt - 1}`, '--jq', '.conclusion'])); } catch { /* attempt gone */ }
  }
  const flakes = findFlakes(runs.filter((r) => r.in_window), prior);

  // Holes need the branch's history and the CI workflows' path filters.
  const log1 = git(['log', '--first-parent', '--reverse', '--format=%H%x09%cI%x09%s', `origin/${branch}`, `--since=${win.startIso}`, `--until=${win.endIso}`]);
  const commits = log1.split('\n').filter(Boolean).map((l) => {
    const [sha, date, ...rest] = l.split('\t');
    let files = [];
    try { files = git(['diff-tree', '--no-commit-id', '--name-only', '-r', '-m', '--first-parent', sha]).split('\n').filter(Boolean); } catch { /* root commit */ }
    return { sha, date, subject: rest.join('\t'), files };
  });
  const filters = {};
  for (const name of ciNames) {
    const r = runs.find((x) => x.name === name && x.path);
    if (!r) continue;
    try { filters[name] = pushFilters(git(['show', `origin/${branch}:${r.path}`])); } catch { /* workflow file moved */ }
  }
  const branchRuns = runs.filter((r) => r.head_branch === branch);
  const holes = findHoles(commits, branchRuns, ciNames, filters);

  const inWin = runs.filter((r) => r.in_window);
  const failures = inWin.filter((r) => FAILED.has(r.conclusion)).map((r) => ({
    run: r.id, workflow: r.name, branch: r.head_branch, sha: r.head_sha.slice(0, 8), event: r.event, at: r.created_at, attempt: r.run_attempt,
    title: (r.display_title || '').slice(0, 80), url: r.html_url,
    failed_jobs: (r.jobs || []).filter((j) => FAILED.has(j.conclusion)).map((j) => ({
      job: j.name, step: ((j.steps || []).find((s) => FAILED.has(s.conclusion)) || {}).name || null,
      s: round(dur(j.started_at, j.completed_at), 0),
    })),
  }));
  const cancelled = inWin.filter((r) => r.conclusion === 'cancelled').map((r) => {
    const next = inWin.find((x) => x.name === r.name && x.head_branch === r.head_branch && ms(x.created_at) > ms(r.created_at) && ms(x.created_at) - ms(r.created_at) < 600000);
    return { run: r.id, workflow: r.name, branch: r.head_branch, sha: r.head_sha.slice(0, 8), at: r.created_at, superseded_by: next ? next.id : null, billed_min: sum((r.jobs || []).map(billedMinutes)) };
  });
  const pushes = holes.filter((g) => !g.unpushed_run).length;
  const filterUse = Object.fromEntries(Object.entries(filters).filter(([, f]) => f.paths || f.ignore).map(([n]) => {
    const ran = holes.filter((g) => g.runs.some((x) => x.workflow === n)).length;
    return [n, { pushes, ran, share: pushes ? round(ran / pushes, 2) : null }];
  }));
  return {
    repo, branch, window: { from: win.from, to: win.to, start_utc: win.startIso, end_utc: win.endIso },
    rate_limit: { before: rate.remaining, after: JSON.parse(gh(['api', 'rate_limit', '--jq', '.resources.core'])).remaining },
    summary: summarize(runs, win, ciNames, holes, flakes),
    speed: summarizeJobs(inWin),
    failures, cancelled, flakes, holes, path_filter_use: filterUse,
    long_jobs: inWin.flatMap((r) => (r.jobs || []).map((j) => ({ run: r.id, workflow: r.name, job: j.name, conclusion: j.conclusion, s: dur(j.started_at, j.completed_at) })))
      .filter((j) => j.s != null).sort((a, b) => b.s - a.s).slice(0, 10),
    runs: inWin.map(({ jobs, ...r }) => ({ ...r, wall_s: jobs ? runWall(jobs) : null, billed_min: jobs ? sum(jobs.map(billedMinutes)) : null })),
  };
}

function text(out) {
  const s = out.summary;
  const lines = [
    `# CI ${out.repo} ${out.window.from} to ${out.window.to} (end exclusive), branch ${out.branch}`,
    `runs ${s.runs} (CI workflows ${s.ci_workflows.join(', ') || 'none found'}: ${s.ci_runs}); by conclusion ${JSON.stringify(s.by_conclusion)}`,
    `by workflow ${JSON.stringify(s.by_workflow)}`,
    ...(s.ci_workflows.length ? [] : [`NO CI: no workflow that checks code ran on ${out.branch} in the window, so every push is unchecked (${s.main_commits} commits). Check that the workflow files are pushed and that Actions is on.`]),
    `failed ${s.failed}, cancelled ${s.cancelled}, flaky ${s.flaky}, holes ${s.holes}, skipped by the workflow's own condition ${s.skipped_pushes} (${s.main_commits} commits on ${out.branch} in ${s.pushes} pushes)`,
    `CI run wall (successful): median ${s.run_median_s} s, p90 ${s.run_p90_s} s; queue median ${s.queue_median_s} s`,
    `billed minutes (estimate) ${s.billed_min}, of which failed or cancelled ${s.billed_wasted_min}; jobs fetched for ${s.jobs_fetched} runs`,
    `rate limit ${out.rate_limit.before} -> ${out.rate_limit.after}`,
    '', 'failures:', ...out.failures.map((f) => `  ${JSON.stringify(f)}`),
    'cancelled:', ...out.cancelled.map((f) => `  ${JSON.stringify(f)}`),
    'flakes:', ...out.flakes.map((f) => `  ${JSON.stringify(f)}`),
    'pushes to the main branch (not passed):', ...out.holes.filter((g) => g.status !== 'passed').map((g) => `  ${JSON.stringify(g)}`),
    'path filters (share of pushes the workflow ran on):', ...Object.entries(out.path_filter_use).map(([n, v]) => `  ${n} ${JSON.stringify(v)}`),
    'speed:', ...Object.entries(out.speed).map(([n, v]) => `  ${n} ${JSON.stringify(v)}`),
    'longest jobs:', ...out.long_jobs.map((j) => `  ${JSON.stringify(j)}`),
  ];
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.out) throw new Error('give --out <ci.json>');
  const win = windowFrom(args);
  const config = loadConfig(args);
  const root = repoRoot() || process.cwd();
  const gh = (a) => run('gh', a, { cwd: root });
  const git = (a) => run('git', a, { cwd: root });
  const repo = args.repo || config.repo || JSON.parse(gh(['repo', 'view', '--json', 'nameWithOwner'])).nameWithOwner;
  const branch = args.branch || config.mainBranch || 'main';
  if (!args['no-fetch']) {
    try { git(['fetch', '--quiet', 'origin', branch]); } catch (e) { console.error(`git fetch failed, using the local origin/${branch}: ${e.message.split('\n')[0]}`); }
  }
  const workflowsGiven = args.workflows ? String(args.workflows).split(',').map((s) => s.trim()) : (config.ci && config.ci.workflows) || null;
  const out = collect({ repo, branch, win, gh, git, workflowsGiven, withJobs: !args['no-jobs'], log: (m) => console.error(m) });
  fs.writeFileSync(path.resolve(String(args.out)), JSON.stringify(out, null, 1));
  console.log(text(out));
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(e.message); process.exit(1); }
}

module.exports = { utcDays, rateFor, billedMinutes, runWall, criticalPath, summarizeJobs, findFlakes, pushFilters, fileTriggers, statusOf, findHoles, pickCiWorkflows, summarize, collect };
