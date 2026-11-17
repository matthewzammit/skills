// Run with: node --test skills/dev-loop-audit/scripts/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const { stuckRuns, text, summarize, SETUP_STEP, utcDays, billedMinutes, criticalPath, findFlakes, pushFilters, fileTriggers, findHoles, pickCiWorkflows, summarizeJobs, collect, prCycle, fetchPrCycle, reviewBots } = require('./ci-runs.js');
const { windowFrom } = require('./common.js');

const at = (min) => new Date(Date.UTC(2026, 9, 20, 10, 0) + min * 60000).toISOString().replace('.000', '');
const job = (name, startMin, endMin, extra = {}) => ({ name, conclusion: 'success', created_at: at(startMin - 0.5), started_at: at(startMin), completed_at: at(endMin), labels: ['ubuntu-latest'], steps: [], ...extra });
const runOf = (id, sha, extra = {}) => ({ id, name: 'CI', path: '.github/workflows/ci.yml', event: 'push', head_branch: 'main', head_sha: sha, status: 'completed', conclusion: 'success', run_attempt: 1, created_at: at(0), ...extra });

test('utcDays covers the window', () => {
  const w = windowFrom({ from: '2026-10-19', to: '2026-10-21' });
  const days = utcDays(w);
  assert.ok(days.includes('2026-10-19') && days.includes('2026-10-20'));
  assert.ok(utcDays(w, 1).length === days.length + 1);
});

test('billed minutes round up per job and use the runner rate', () => {
  assert.strictEqual(billedMinutes(job('a', 0, 1.1)), 2);
  assert.strictEqual(billedMinutes(job('a', 0, 3, { labels: ['macos-14'] })), 30);
  assert.strictEqual(billedMinutes(job('a', 0, 3, { labels: ['self-hosted', 'linux'] })), 0);
  assert.strictEqual(billedMinutes(job('a', 0, 3, { conclusion: 'skipped' })), 0);
});

test('criticalPath follows the jobs that waited on each other', () => {
  const jobs = [job('install', 0, 2), job('lint', 2.1, 3), job('test', 2.1, 6), job('deploy', 6.1, 7)];
  assert.deepStrictEqual(criticalPath(jobs), ['install', 'test', 'deploy']);
});

test('summarizeJobs uses successful runs only', () => {
  const runs = [
    { ...runOf(1, 'a'), jobs: [job('test', 0, 2)] },
    { ...runOf(2, 'b'), jobs: [job('test', 0, 4)] },
    { ...runOf(3, 'c', { conclusion: 'failure' }), jobs: [job('test', 0, 30, { conclusion: 'failure' })] },
  ];
  const s = summarizeJobs(runs).CI;
  assert.strictEqual(s.successful_runs, 2);
  assert.strictEqual(s.wall_median_s, 180);
  assert.strictEqual(s.jobs.test.queue_median_s, 30);
});

test('summarizeJobs numbers steps that share a name', () => {
  const steps = [
    { name: 'Run actions/cache@v5', conclusion: 'success', started_at: at(0), completed_at: at(0.5) },
    { name: 'Run actions/cache@v5', conclusion: 'success', started_at: at(1), completed_at: at(1.05) },
  ];
  const s = summarizeJobs([{ ...runOf(1, 'a'), jobs: [job('test', 0, 2, { steps })] }]).CI.jobs.test.steps;
  assert.strictEqual(s['Run actions/cache@v5'].median_s, 30);
  assert.strictEqual(s['Run actions/cache@v5 #2'].median_s, 3);
});

test('summarizeJobs splits setup from the checks', () => {
  const step = (name, a, b) => ({ name, conclusion: 'success', started_at: at(a), completed_at: at(b) });
  const steps = [
    step('Set up job', 0, 0.05), step('Run actions/checkout@v5', 0.05, 0.1), step('Run actions/cache@v5', 0.1, 0.5),
    step('Run npm ci', 0.5, 1), step('Run npm run lint', 1, 1.5), step('Run npm test', 1.5, 3), step('Post Run actions/cache@v5', 3, 3.1),
  ];
  const s = summarizeJobs([{ ...runOf(1, 'a'), jobs: [job('test', 0, 3.1, { steps })] }]).CI.jobs.test;
  assert.strictEqual(s.setup_median_s, 66);
  assert.ok(!SETUP_STEP.test('Run npm run lint') && !SETUP_STEP.test('Run npm test'));
  assert.ok(SETUP_STEP.test('Run pnpm/action-setup@v4') && SETUP_STEP.test('Install dependencies'));
});

test('flakes: green on a re-run, or a later run on the same commit', () => {
  const runs = [
    runOf(1, 'aaaaaaaa1', { run_attempt: 2 }),
    runOf(2, 'bbbbbbbb2', { conclusion: 'failure', created_at: at(0) }),
    runOf(3, 'bbbbbbbb2', { created_at: at(5) }),
    runOf(4, 'cccccccc3', { conclusion: 'failure' }),
  ];
  const f = findFlakes(runs, { 1: 'failure' });
  assert.deepStrictEqual(f.map((x) => x.kind).sort(), ['new run', 'rerun']);
});

test('push path filters', () => {
  const f = pushFilters("on:\n  push:\n    branches: [main]\n    paths-ignore:\n      - '**.md'\n      - 'docs/**'\n");
  assert.ok(!fileTriggers('docs/a.txt', f));
  assert.ok(!fileTriggers('README.md', f));
  assert.ok(fileTriggers('src/a.ts', f));
  const g = pushFilters("on:\n  push:\n    paths:\n      - 'src/**'\n      - '!src/**/*.md'\n");
  assert.ok(fileTriggers('src/a.ts', g));
  assert.ok(!fileTriggers('src/a.md', g));
  assert.ok(!fileTriggers('docs/a.ts', g));
});

test('holes: a push CI did not pass, unless the next push passed within an hour', () => {
  const c = (sha, files = ['src/a.ts']) => ({ sha, date: at(0), subject: `commit ${sha}`, files });
  const commits = [c('a1'), c('a2'), c('b1'), c('d1', ['docs/x.md']), c('e1'), c('f1'), c('g1')];
  const runs = [
    runOf(1, 'a2', { created_at: at(0) }), // a1 + a2 pushed together, passed
    runOf(2, 'b1', { conclusion: 'cancelled', created_at: at(10) }), // covered by the next push
    runOf(3, 'e1', { created_at: at(20) }), // d1 had no run and only docs: fine
    runOf(4, 'f1', { conclusion: 'failure', created_at: at(100) }), // red, and the next push is skipped
    runOf(5, 'g1', { conclusion: 'skipped', created_at: at(300) }),
  ];
  const filters = { CI: pushFilters("on:\n  push:\n    paths-ignore: ['docs/**']\n") };
  const groups = findHoles(commits, runs, ['CI'], filters);
  const by = Object.fromEntries(groups.map((g) => [g.tip, g]));
  assert.strictEqual(by.a2.commits, 2);
  assert.strictEqual(by.a2.hole, false);
  assert.strictEqual(by.b1.hole, false);
  assert.strictEqual(by.b1.covered_by, 'e1');
  assert.strictEqual(by.e1.commits, 2); // d1 rode along with e1's push
  assert.strictEqual(by.f1.status, 'failure');
  assert.strictEqual(by.f1.hole, true);
  assert.strictEqual(by.g1.status, 'skipped');
  assert.strictEqual(by.g1.hole, false);
});

test('with no CI workflow, every push with files is a hole', () => {
  const groups = findHoles([{ sha: 'a1', date: at(0), subject: 'x', files: ['src/a.ts'] }], [], []);
  assert.strictEqual(groups[0].status, 'no_ci');
  assert.strictEqual(groups[0].hole, true);
});

test('pickCiWorkflows leaves out announce, release and deploy workflows', () => {
  const runs = [runOf(1, 'a'), runOf(2, 'a', { name: 'Deploy preview' }), runOf(3, 'a', { name: 'Tests', head_branch: 'feat' })];
  assert.deepStrictEqual(pickCiWorkflows(runs, 'main'), ['CI']);
  assert.deepStrictEqual(pickCiWorkflows(runs, 'main', ['Tests']), ['Tests']);
});

test('collect reads gh and git through the functions it is given', () => {
  const win = windowFrom({ from: '2026-10-20', to: '2026-10-21' });
  const calls = [];
  const gh = (args) => {
    calls.push(args.join(' '));
    if (args[1] === 'rate_limit') return JSON.stringify({ remaining: 4000, reset: 0 });
    if (args.includes('created=2026-10-20')) return `${JSON.stringify(runOf(7, 'abc123', { created_at: '2026-10-20T10:00:00Z' }))}\n`;
    if (args.some((a) => a.endsWith('/actions/runs'))) return '';
    if (args.some((a) => /runs\/7\/jobs/.test(a))) return `${JSON.stringify(job('test', 0, 2))}\n`;
    throw new Error(`unexpected gh ${args.join(' ')}`);
  };
  const git = (args) => {
    if (args[0] === 'log') return 'abc123\t2026-10-20T09:59:00Z\tMerge PR 1\n';
    if (args[0] === 'diff-tree') return 'src/a.ts\n';
    if (args[0] === 'show') return 'on:\n  push:\n    branches: [main]\n';
    throw new Error(`unexpected git ${args.join(' ')}`);
  };
  const out = collect({ repo: 'o/r', branch: 'main', win, gh, git });
  assert.strictEqual(out.summary.runs, 1);
  assert.strictEqual(out.summary.ci_workflows[0], 'CI');
  assert.strictEqual(out.summary.holes, 0);
  assert.strictEqual(out.summary.billed_min, 2);
  assert.ok(calls.some((c) => c.includes('created=2026-10-20')));
});

test('with real pushes, a push no workflow ran on is a hole only when CI watches its files', () => {
  const c = (sha, files) => ({ sha, date: at(0), subject: `commit ${sha}`, files });
  const commits = [c('d1', ['docs/x.md']), c('s1', ['src/a.ts']), c('s2', ['src/b.ts'])];
  const runs = [runOf(1, 's2', { created_at: at(200) })];
  const filters = { CI: pushFilters("on:\n  push:\n    paths-ignore: ['docs/**']\n") };
  const pushes = new Map([['d1', at(0)], ['s1', at(5)], ['s2', at(200)]]);
  const by = Object.fromEntries(findHoles(commits, runs, ['CI'], filters, pushes).map((g) => [g.tip, g]));
  assert.strictEqual(by.d1.status, 'no_run');
  assert.strictEqual(by.d1.hole, false);
  assert.strictEqual(by.s1.hole, false); // code with no run, but the later green run on s2 contains it
  assert.strictEqual(by.s1.covered_by, 's2');
  assert.strictEqual(by.s1.covered_after_min, 195);
  assert.strictEqual(by.s2.hole, false);
});

test('holes: any later successful run on a descendant covers a push, even past a cancelled push', () => {
  const c = (sha) => ({ sha, date: at(0), subject: `commit ${sha}`, files: ['src/a.ts'] });
  const runs = [
    runOf(1, 'a1', { conclusion: 'cancelled', created_at: at(0) }),
    runOf(2, 'b1', { conclusion: 'cancelled', created_at: at(10) }), // superseded, the run that replaced it passed
    runOf(3, 'c1', { created_at: at(20) }),
    runOf(4, 'd1', { conclusion: 'cancelled', created_at: at(200) }),
    runOf(5, 'e1', { created_at: at(400) }), // passed hours later: still covers d1
  ];
  const pushes = new Map([['a1', at(0)], ['b1', at(10)], ['c1', at(20)], ['d1', at(200)], ['e1', at(400)]]);
  const by = Object.fromEntries(findHoles(['a1', 'b1', 'c1', 'd1', 'e1'].map(c), runs, ['CI'], {}, pushes).map((g) => [g.tip, g]));
  assert.strictEqual(by.a1.hole, false);
  assert.strictEqual(by.a1.covered_by, 'c1');
  assert.strictEqual(by.b1.hole, false);
  assert.strictEqual(by.d1.hole, false);
  assert.strictEqual(by.d1.covered_by, 'e1');
  assert.strictEqual(by.d1.covered_after_min, 200);
});

test('holes: a later green run covers only when it descends from the push; the first run after the window counts', () => {
  const c = (sha) => ({ sha, date: at(0), subject: `commit ${sha}`, files: ['src/a.ts'] });
  const runs = [
    runOf(1, 'a1', { conclusion: 'failure', created_at: at(0) }),
    runOf(2, 'x9', { created_at: at(30) }), // green, but on a commit that does not contain a1 (history rewritten)
    runOf(3, 'b1', { conclusion: 'cancelled', created_at: at(60) }),
    runOf(4, 'n1', { created_at: at(900), in_window: false }), // the first green run after the window, next morning
    runOf(5, 'n2', { created_at: at(1000), in_window: false }),
  ];
  const pushes = new Map([['a1', at(0)], ['b1', at(60)]]);
  const asked = [];
  const isAncestor = (tip, sha) => { asked.push(`${tip}>${sha}`); return sha === 'n1' || (tip === 'a1' && sha === 'b1'); };
  const by = Object.fromEntries(findHoles([c('a1'), c('b1')], runs, ['CI'], {}, pushes, isAncestor).map((g) => [g.tip, g]));
  assert.strictEqual(by.a1.covered_by, 'n1');
  assert.strictEqual(by.b1.covered_by, 'n1');
  assert.ok(asked.includes('a1>x9') && !asked.some((q) => q.endsWith('>n2')));
  const none = Object.fromEntries(findHoles([c('a1'), c('b1')], runs, ['CI'], {}, pushes, (tip, sha) => sha === 'x9').map((g) => [g.tip, g]));
  assert.strictEqual(none.a1.covered_by, 'x9');
  assert.strictEqual(none.b1.hole, true); // x9 ran before b1 was pushed
});

test('stuck runs: queued or in progress over 6 hours at audit time, listed in the text', () => {
  const now = Date.parse(at(0)) + 7 * 3600000;
  const runs = [
    runOf(1, 'a', { status: 'queued', conclusion: null, created_at: at(0) }),
    runOf(2, 'b', { status: 'in_progress', conclusion: null, created_at: at(400) }), // under 6 h old
    runOf(3, 'c', { created_at: at(0) }),
  ];
  const stuck = stuckRuns(runs, now);
  assert.deepStrictEqual(stuck.map((r) => r.run), [1]);
  assert.strictEqual(stuck[0].age_h, 7);
  const win = windowFrom({ from: '2026-10-20', to: '2026-10-21' });
  const s = summarize(runs.map((r) => ({ ...r, in_window: true })), win, ['CI'], [], [], [], now);
  assert.strictEqual(s.stuck_queued, 1);
  const out = { repo: 'o/r', branch: 'main', window: { from: 'a', to: 'b' }, rate_limit: {}, summary: { ...s, pushes_from: 'x' },
    failures: [], cancelled: [], flakes: [], holes: [], stuck_runs: stuck, path_filter_use: {}, speed: {}, long_jobs: [] };
  assert.match(text(out), /stuck \(queued or in progress over 6 h\): 1, runs 1/);
});

test('CI speed is split at a past fix inside the window', () => {
  const win = windowFrom({ from: '2026-10-20', to: '2026-10-21' });
  const runs = [
    { ...runOf(1, 'a', { created_at: at(0) }), jobs: [job('t', 0, 5)] },
    { ...runOf(2, 'b', { created_at: at(10) }), jobs: [job('t', 0, 6)] },
    { ...runOf(3, 'c', { created_at: at(100) }), jobs: [job('t', 0, 3)] },
    { ...runOf(4, 'd', { created_at: at(110) }), jobs: [job('t', 0, 4)] },
  ].map((r) => ({ ...r, in_window: true }));
  const fixes = [{ name: 'cache', at: at(50) }, { name: 'old', at: '2026-01-01T00:00:00Z' }];
  const s = summarize(runs, win, ['CI'], [], [], fixes);
  assert.strictEqual(s.run_median_s, 270);
  assert.strictEqual(s.fix_splits.length, 1); // the fix outside the window is left out
  assert.deepStrictEqual(s.fix_splits[0].before, { n: 2, median_s: 330, p90_s: 360 });
  assert.deepStrictEqual(s.fix_splits[0].after, { n: 2, median_s: 210, p90_s: 240 });
});

test('collect reads a merge push against its first parent only', () => {
  const win = windowFrom({ from: '2026-10-20', to: '2026-10-21' });
  const seen = [];
  const gh = (args) => {
    if (args[1] === 'rate_limit') return JSON.stringify({ remaining: 4000, reset: 0 });
    return '';
  };
  const git = (args) => {
    seen.push(args);
    if (args[0] === 'log') return 'abc123\t2026-10-20T09:59:00Z\tMerge PR 1\n';
    if (args[0] === 'diff-tree') return 'docs/a.md\n';
    throw new Error('no');
  };
  collect({ repo: 'o/r', branch: 'main', win, gh, git, withJobs: false });
  const dt = seen.find((a) => a[0] === 'diff-tree');
  assert.ok(dt.includes('--diff-merges=first-parent'));
  assert.ok(!dt.includes('-m') && !dt.includes('--first-parent'));
});

const prAt = (number, openMin, mergeMin) => ({ number, createdAt: at(openMin), mergedAt: at(mergeMin), isDraft: false, author: { login: 'a' } });

test('prCycle gives median, p90 and the slowest three, and null with no PRs', () => {
  const win = windowFrom({ from: '2026-10-20', to: '2026-10-21' });
  const prs = [prAt(1, 0, 10), prAt(2, 0, 20), prAt(3, 0, 30), prAt(4, 0, 40), prAt(5, 0, 600),
    { ...prAt(6, -5000, -4000), mergedAt: '2026-10-01T00:00:00Z' }, { number: 7, createdAt: at(0), mergedAt: null }];
  const c = prCycle(prs, win);
  assert.strictEqual(c.merged, 5);
  assert.strictEqual(c.median_min, 30);
  assert.strictEqual(c.p90_min, 600);
  assert.deepStrictEqual(c.slowest, [{ number: 5, minutes: 600 }, { number: 4, minutes: 40 }, { number: 3, minutes: 30 }]);
  assert.strictEqual(prCycle([], win), null);
  assert.strictEqual(prCycle([prs[5]], win), null);
});

test('fetchPrCycle asks gh for merged PRs and never throws', () => {
  const win = windowFrom({ from: '2026-10-20', to: '2026-10-21' });
  let seen;
  const ok = fetchPrCycle((a) => { seen = a; return JSON.stringify([prAt(1, 0, 10)]); }, 'o/r', win);
  assert.strictEqual(ok.value.merged, 1);
  assert.ok(seen.includes('merged:2026-10-20..2026-10-21') && seen.includes('o/r'));
  const bad = fetchPrCycle(() => { throw new Error('gh: not logged in\nmore'); }, 'o/r', win);
  assert.deepStrictEqual(bad, { value: null, error: 'gh: not logged in' });
});

test('reviewBots groups review workflows by name on pull request events', () => {
  const pr = (id, name, branch, extra = {}) => ({ id, name, path: '.github/workflows/x.yml', event: 'pull_request', head_branch: branch, ...extra });
  const bots = reviewBots([
    pr(1, 'Claude Code Review', 'a', { jobs: [job('review', 0, 2.5)] }), pr(2, 'Claude Code Review', 'a', { jobs: [job('review', 0, 1)] }),
    pr(3, 'Claude Code Review', 'b'), pr(4, 'CI', 'a'), pr(5, 'Claude Code Review', 'main', { event: 'push' }),
    pr(6, 'Checks', 'c', { path: '.github/workflows/coderabbit.yml', event: 'pull_request_target' }),
  ]);
  assert.strictEqual(bots.length, 2);
  assert.deepStrictEqual(bots[0], { workflow: 'Claude Code Review', runs: 3, prs: 2, runs_per_pr_median: 1.5, billed_min: 4 });
  assert.deepStrictEqual(bots[1], { workflow: 'Checks', runs: 1, prs: 1, runs_per_pr_median: 1, billed_min: null });
  assert.deepStrictEqual(reviewBots([pr(1, 'CI', 'a')]), []);
});
