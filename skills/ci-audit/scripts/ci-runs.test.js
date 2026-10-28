// Run with: node --test skills/ci-audit/scripts/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const { utcDays, billedMinutes, criticalPath, findFlakes, pushFilters, fileTriggers, findHoles, pickCiWorkflows, summarizeJobs, collect } = require('./ci-runs.js');
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
  assert.strictEqual(by.s1.hole, true); // code with no run; the next pass came over an hour later
  assert.strictEqual(by.s2.hole, false);
});
