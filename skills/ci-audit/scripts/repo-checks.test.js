// Run with: node --test skills/ci-audit/scripts/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const { checkWorkflow, commandsIn, expand } = require('./repo-checks.js');

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
