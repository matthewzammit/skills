const test = require('node:test');
const assert = require('node:assert');
const { planChecks, formatPlan } = require('./plan.js');
const { mergeConfig } = require('./verify-lib.js');

const config = mergeConfig({
  checks: [
    { token: 'lint', command: 'npm run lint', paths: ['src/**'] },
    { token: 'test', command: 'npm test', paths: ['src/**', 'test/**'] },
    { token: 'api', command: 'npm run test:api', paths: ['server/**'] },
    { token: 'full', command: 'npm run validate', paths: ['**'] },
    { token: 'app', manual: true, description: 'open the changed screen', paths: ['src/ui/**'] },
  ],
});

test('checks come out in config order, only for matching paths', () => {
  const plan = planChecks(['src/a.js'], config);
  assert.deepStrictEqual(plan.checks.map((c) => c.token), ['lint', 'test', 'full']);
  assert.strictEqual(plan.stamp, 'Verified: lint, test, full');
});

test('a server change picks the api check, not lint', () => {
  assert.deepStrictEqual(planChecks(['server/x.js'], config).checks.map((c) => c.token), ['api', 'full']);
});

test('docs-only and empty diffs suggest none with a reason', () => {
  assert.strictEqual(planChecks(['README.md', 'docs/a.md'], config).stamp, 'Verified: none (docs only)');
  assert.strictEqual(planChecks([], config).stamp, 'Verified: none (no changes)');
});

test('files no check covers suggest none', () => {
  const c = mergeConfig({ checks: [{ token: 'lint', command: 'x', paths: ['src/**'] }] });
  assert.match(planChecks(['other/a.js'], c).stamp, /none \(no check covers/);
});

test('formatPlan numbers the steps and names the marker for proven tokens', () => {
  const text = formatPlan(planChecks(['src/ui/a.js'], config), config);
  assert.match(text, /1\. \[lint\] npm run lint/);
  assert.match(text, /\[full\] npm run validate \(then: node \.verify\/mark-pass\.js full\)/);
  assert.match(text, /\[app\] agent looks: open the changed screen/);
  assert.match(text, /Verified: lint, test, full, app/);
});

test('the config template parses and plans a source change', () => {
  const tpl = JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'templates', 'config.json'), 'utf8'));
  const plan = planChecks(['src/a.js'], mergeConfig(tpl));
  assert.deepStrictEqual(plan.checks.map((c) => c.token), ['lint', 'types', 'test', 'full', 'app']);
});
