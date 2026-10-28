// Run with: node --test skills/ci-audit/scripts/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const { repoNameFromUrl, parseArgs, windowFrom, median, p90, parseYaml, globToRegex, redact } = require('./common.js');

test('parseArgs reads flags, values and repeats', () => {
  const a = parseArgs(['--from', '2026-10-19', '--no-jobs', '--match', 'a', '--match', 'b', 'x']);
  assert.strictEqual(a.from, '2026-10-19');
  assert.strictEqual(a['no-jobs'], true);
  assert.deepStrictEqual(a.match, ['a', 'b']);
  assert.deepStrictEqual(a._, ['x']);
});

test('parseArgs refuses options joined into one argument', () => {
  assert.throws(() => parseArgs(['--from 2026-10-19 --config c.json']), /one option per argument/);
});

test('the default window is last week, Monday to Monday', () => {
  const w = windowFrom({}, new Date(2026, 9, 28, 15, 0)); // a Wednesday
  assert.strictEqual(w.from, '2026-10-19');
  assert.strictEqual(w.to, '2026-10-26');
  const mon = windowFrom({}, new Date(2026, 9, 26, 8, 30)); // a Monday morning
  assert.strictEqual(mon.from, '2026-10-19');
  assert.strictEqual(mon.to, '2026-10-26');
});

test('--days and --from/--to windows', () => {
  const d = windowFrom({ days: '7' }, new Date(2026, 9, 28, 15, 0));
  assert.strictEqual(d.from, '2026-10-21');
  assert.strictEqual(d.to, '2026-10-28');
  const f = windowFrom({ from: '2026-10-01', to: '2026-11-01' });
  assert.strictEqual(f.from, '2026-10-01');
  assert.throws(() => windowFrom({ from: '2026-10-01' }), /both/);
  assert.throws(() => windowFrom({ from: '2026-10-02', to: '2026-10-01' }), /ends before/);
});

test('median and p90 (nearest rank)', () => {
  assert.strictEqual(median([3, 1, 2]), 2);
  assert.strictEqual(median([1, 2, 3, 4]), 2.5);
  assert.strictEqual(median([]), null);
  assert.strictEqual(p90([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), 10);
  assert.strictEqual(p90([5]), 5);
});

test('parseYaml reads a workflow file', () => {
  const doc = parseYaml(`
name: CI # the main check
on:
  push:
    branches: [main]
    paths-ignore:
      - '**.md'
      - "docs/**"
  workflow_dispatch:
jobs:
  test:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - name: Lint
        run: npm run lint || true
      - run: |
          npm ci
          npm test
`);
  assert.strictEqual(doc.name, 'CI');
  assert.deepStrictEqual(doc.on.push.branches, ['main']);
  assert.deepStrictEqual(doc.on.push['paths-ignore'], ['**.md', 'docs/**']);
  assert.ok('workflow_dispatch' in doc.on);
  assert.strictEqual(doc.jobs.test['timeout-minutes'], 15);
  assert.strictEqual(doc.jobs.test.steps.length, 3);
  assert.strictEqual(doc.jobs.test.steps[1].run, 'npm run lint || true');
  assert.strictEqual(doc.jobs.test.steps[2].run, 'npm ci\nnpm test');
});

test('parseYaml: a list at the same indent as its key, and inline maps', () => {
  const doc = parseYaml('a:\n- x\n- y\nb: {k: v, n: 2}\n');
  assert.deepStrictEqual(doc.a, ['x', 'y']);
  assert.deepStrictEqual(doc.b, { k: 'v', n: 2 });
});

test('globToRegex follows GitHub path filters', () => {
  assert.ok(globToRegex('**.md').test('docs/a/b.md'));
  assert.ok(globToRegex('docs/**').test('docs/a/b.txt'));
  assert.ok(!globToRegex('docs/*').test('docs/a/b.txt'));
  assert.ok(globToRegex('src/**/*.ts').test('src/a.ts'));
});

test('redact masks tokens and keeps the rest', () => {
  const s = redact('curl -H "Authorization: Bearer abcdefghijklmnop123" ghp_abcdefghijklmnopqrstuvwxyz123 ok');
  assert.ok(!s.includes('abcdefghijklmnop123'));
  assert.ok(!s.includes('ghp_abcdefghijklmnopqrstuvwxyz123'));
  assert.ok(s.endsWith('ok'));
});

test('repoNameFromUrl reads ssh and https remotes', () => {
  assert.strictEqual(repoNameFromUrl('git@github.com:owner/my-app.git\n'), 'my-app');
  assert.strictEqual(repoNameFromUrl('https://github.com/owner/my-app'), 'my-app');
  assert.strictEqual(repoNameFromUrl(''), null);
});
