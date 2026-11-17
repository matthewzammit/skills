// Run with: node --test skills/dev-loop-audit/scripts/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const { hookDrift, checkWorkflow, commandsIn, expand, isTestPath, isCodePath, lateSkips, sizeOf, testGrowth, growthLine, parseGrepCounts, measureGrowth } = require('./repo-checks.js');

const WORKFLOW = `name: CI
on:
  push:
    branches: [main]
    paths:
      - 'src/**'
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [18, 20]
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint || true
      - name: Tests
        run: npx vitest run
        continue-on-error: true
  done:
    if: always()
    needs: [test]
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - run: echo "all done"
`;

test('checkWorkflow finds the ways a failure cannot block', () => {
  const w = checkWorkflow('.github/workflows/ci.yml', WORKFLOW);
  const kinds = w.findings.map((f) => `${f.kind}:${f.job || ''}`);
  assert.ok(kinds.includes('no_timeout:test'));
  assert.ok(!kinds.includes('no_timeout:done'));
  assert.ok(kinds.includes('error_swallowed:test'));
  assert.ok(kinds.includes('continue_on_error:test'));
  assert.ok(kinds.includes('summary_passes_on_failure:done'));
  assert.ok(kinds.includes('path_filter:'));
  assert.ok(w.findings.find((f) => f.kind === 'error_swallowed').line === 16);
});

test('a summary job that reads needs.*.result is fine', () => {
  const w = checkWorkflow('x.yml', WORKFLOW.replace('echo "all done"', '[ "${{ contains(needs.*.result, \'failure\') }}" = false ]'));
  assert.ok(!w.findings.some((f) => f.kind === 'summary_passes_on_failure'));
});

test('commandsIn names scripts and tools', () => {
  assert.deepStrictEqual(commandsIn('npm run lint && npx tsc --noEmit\npnpm test'), ['script:lint', 'script:test', 'tool:tsc']);
  assert.deepStrictEqual(commandsIn('npm ci'), []);
});

test('expand follows package.json scripts, with pre scripts', () => {
  const scripts = { validate: 'npm run lint && npm run typecheck', lint: 'eslint .', prelint: 'node clean.js', typecheck: 'tsc --noEmit' };
  assert.deepStrictEqual(expand(['script:validate'], scripts), ['script:lint', 'script:typecheck', 'script:validate', 'tool:eslint', 'tool:tsc']);
});

test('hookDrift lists worktrees whose hooks differ from the main branch\'s', () => {
  const d = hookDrift([
    { path: '/r/main', branch: 'main', git_hooks: 'aa', agent_hooks: 'bb' },
    { path: '/r/new', branch: 'feat/new', git_hooks: 'aa', agent_hooks: 'bb' },
    { path: '/r/old', branch: 'feat/old', git_hooks: 'a0', agent_hooks: 'b0' },
  ], '/r/main');
  assert.deepStrictEqual(d.map((x) => [x.branch, x.git_differs, x.agent_differs]), [['feat/old', true, true]]);
});

test('testScopeIn names the test runners a gate calls and whether they are scoped to the change', () => {
  const { testScopeIn } = require('./repo-checks.js');
  assert.deepStrictEqual(testScopeIn(['npm run lint\nnpx jest --coverage']), { runners: ['jest'], scoped: [] });
  assert.deepStrictEqual(testScopeIn(['npx jest --changedSince=origin/main']), { runners: ['jest'], scoped: ['--changedSince'] });
  assert.deepStrictEqual(testScopeIn(['vitest run --changed origin/main']).scoped, ['--changed']);
  assert.deepStrictEqual(testScopeIn(['pytest --testmon -q']), { runners: ['pytest'], scoped: ['--testmon'] });
  assert.deepStrictEqual(testScopeIn(['go test ./...', 'cargo nextest run']).runners, ['go test', 'cargo test']);
  assert.deepStrictEqual(testScopeIn(['npx nx affected -t test']).scoped, ['affected']);
  // A comment about a flag is not a use of it.
  assert.deepStrictEqual(testScopeIn(['# we could use --changedSince here\nnpx jest']).scoped, []);
  assert.deepStrictEqual(testScopeIn(['npm run lint']), { runners: [], scoped: [] });
});

test('testScopeIn counts a test script that wraps its own runner', () => {
  const { testScopeIn } = require('./repo-checks.js');
  assert.deepStrictEqual(testScopeIn(['npm run test:coverage -- --changed']), { runners: ['script test:coverage'], scoped: ['--changed'] });
});

test('isTestPath knows test files across languages', () => {
  for (const p of ['src/a.test.ts', 'src/a.spec.js', 'pkg/x_test.go', 'tests/test_x.py', 'x/test_x.py', 'x/y_test.py', 'src/__tests__/a.ts', 'tests/a.rs', 'test/a.rb', 'spec/a.rb',
    'App/FooTests.swift', 'app/FooTest.kt', 'src/FooTest.java', 'spec/foo_spec.rb']) assert.ok(isTestPath(p), p);
  for (const p of ['src/a.ts', 'src/latest.ts', 'src/contest.py', 'src/Foo.swift', 'src/attestation.go']) assert.ok(!isTestPath(p), p);
});

test('isCodePath skips tests, vendored, built, declarations and generated files', () => {
  assert.ok(isCodePath('src/a.ts') && isCodePath('main.go') && isCodePath('App.swift'));
  for (const p of ['src/a.test.ts', 'node_modules/x/a.js', 'vendor/a.go', 'dist/a.js', 'build/a.js', 'src/a.d.ts', 'src/a.generated.ts', 'api/a.pb.go', 'README.md', 'a.json']) assert.ok(!isCodePath(p), p);
});

test('sizeOf counts test and code lines and the test share', () => {
  const paths = ['src/a.ts', 'src/a.test.ts', 'src/b.ts', 'README.md'];
  const lines = new Map([['src/a.ts', 60], ['src/a.test.ts', 30], ['src/b.ts', 10], ['README.md', 99]]);
  assert.deepStrictEqual(sizeOf(paths, lines), { test_files: 1, test_lines: 30, code_lines: 70, test_share: 0.3 });
  assert.deepStrictEqual(sizeOf(paths, null), { test_files: 1, test_lines: null, code_lines: null, test_share: null });
});

test('testGrowth with and without a start commit', () => {
  const now = { test_files: 12, test_lines: 300, code_lines: 700, test_share: 0.3 };
  const start = { test_files: 10, test_lines: 200, code_lines: 600, test_share: 0.25 };
  const g = testGrowth(now, start);
  assert.deepStrictEqual(g.delta, { test_files: 2, test_lines: 100, code_lines: 100 });
  assert.strictEqual(growthLine(g), 'test growth: 12 test files (+2 in the window), 300 test lines (+100), 30% of test+code lines (was 25%); code +100 lines');
  const none = testGrowth(now, null);
  assert.strictEqual(none.start, null);
  assert.strictEqual(none.delta, null);
  assert.strictEqual(growthLine(none), 'test growth: 12 test files, 300 test lines, 30% of test+code lines; code 700 lines');
});

test('parseGrepCounts reads git grep -c output', () => {
  const m = parseGrepCounts('abc:src/a.ts:12\nabc:src/we:ird.ts:3\n', 'abc');
  assert.strictEqual(m.get('src/a.ts'), 12);
  assert.strictEqual(m.get('src/we:ird.ts'), 3);
});

test('measureGrowth reads head and the window start with a faked git', () => {
  const calls = [];
  const git = (a) => {
    calls.push(a.join(' '));
    if (a[0] === 'rev-parse') return 'headsha\n';
    if (a[0] === 'rev-list') return a.some((x) => x.startsWith('--before=')) ? 'startsha\n' : '';
    if (a[0] === 'ls-tree') return a.includes('headsha') ? 'a.ts\na.test.ts\nb.test.ts\n' : 'a.ts\na.test.ts\n';
    if (a[0] === 'grep') return a.includes('headsha') ? 'headsha:a.ts:10\nheadsha:a.test.ts:5\nheadsha:b.test.ts:5\n' : 'startsha:a.ts:8\nstartsha:a.test.ts:2\n';
    throw new Error('unexpected');
  };
  const g = measureGrowth(git, 'origin/main', '2026-11-10T00:00:00.000Z');
  assert.deepStrictEqual(g.delta, { test_files: 1, test_lines: 8, code_lines: 2 });
  assert.strictEqual(g.now.test_share, 0.5);
  assert.strictEqual(calls.filter((c) => c.startsWith('grep')).length, 2);
  // A file cap turns line counting off and says so.
  const capped = measureGrowth(git, 'origin/main', '2026-11-10T00:00:00.000Z', 1);
  assert.strictEqual(capped.now.test_lines, null);
  assert.match(capped.now.skipped_lines, /more than 1 source files/);
});

const LATE = `name: CI
on: [push]
jobs:
  late:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
      - run: npm ci
      - id: changed
        run: echo "src=true" >> "$GITHUB_OUTPUT"
      - if: steps.changed.outputs.src == 'true'
        run: npm test
  early:
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - id: decide
        run: echo "go=true" >> "$GITHUB_OUTPUT"
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          filter: blob:none
      - if: steps.decide.outputs.go == 'true'
        run: npm test
`;

test('a step that decides to skip after checkout and install is a late skip', () => {
  const r = checkWorkflow('.github/workflows/ci.yml', LATE);
  assert.deepStrictEqual(r.late_skips, [{ file: '.github/workflows/ci.yml', job: 'late', step_id: 'changed', after: 'npm ci' }]);
});

test('a decide step before any setup is not a late skip, even in a job with its own if', () => {
  assert.deepStrictEqual(lateSkips([{ id: 'd', run: 'echo' }, { uses: 'actions/checkout@v4' }, { if: 'steps.d.outputs.x', run: 'npm test' }]), []);
  // A cache restore whose cache-hit output gates an install is a cache check, not a decision to skip the job.
  assert.deepStrictEqual(lateSkips([{ uses: 'actions/checkout@v4' }, { id: 'c', uses: 'actions/cache@v4' }, { if: "steps.c.outputs.cache-hit != 'true'", run: 'npm ci' }]), []);
  assert.deepStrictEqual(lateSkips([{ uses: 'actions/checkout@v4' }, { id: 'unused', run: 'echo' }, { run: 'npm test' }]), []);
  assert.strictEqual(checkWorkflow('ci.yml', LATE).late_skips.filter((l) => l.job === 'early').length, 0);
});

test('fetch-depth 0 without filter is a full history checkout, with filter it is not', () => {
  const r = checkWorkflow('.github/workflows/ci.yml', LATE);
  assert.deepStrictEqual(r.full_history_checkouts, [{ file: '.github/workflows/ci.yml', job: 'late' }]);
});
