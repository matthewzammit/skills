// Run with: node --test skills/verify-setup/scripts/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const lib = require('./verify-lib.js');

test('globToRegex handles **, *, ? and braces', () => {
  const m = (g, f) => lib.globToRegex(g).test(f);
  assert.ok(m('src/**', 'src/a/b.ts'));
  assert.ok(m('**/*.md', 'README.md'));
  assert.ok(m('**/*.md', 'docs/a/b.md'));
  assert.ok(!m('src/*.ts', 'src/a/b.ts'));
  assert.ok(m('src/*.{ts,tsx}', 'src/a.tsx'));
  assert.ok(!m('src/*.{ts,tsx}', 'src/a.js'));
  assert.ok(m('*.json', 'a/b/package.json'));
  assert.ok(m('**', 'anything/at/all'));
  assert.ok(m('a?c', 'abc'));
  assert.ok(!m('a.c', 'abc'));
});

test('parseStamp reads tokens, none and the reason', () => {
  assert.deepStrictEqual(lib.parseStamp('Fix\n\nVerified: lint, test\nCo-Authored-By: Claude <a@b>').tokens, ['lint', 'test']);
  const none = lib.parseStamp('Fix\n\nVerified: none (docs only)');
  assert.strictEqual(none.none, true);
  assert.strictEqual(none.reason, 'docs only');
  assert.strictEqual(lib.parseStamp('Fix').found, false);
});

test('parseStamp reads only the last paragraph', () => {
  const msg = 'Fix\n\nVerified: full\n\nSome more notes\nCo-Authored-By: Claude <a@b>';
  assert.strictEqual(lib.parseStamp(msg).found, false);
  const quoted = 'Fix\n\n> Verified: full\n\nCo-Authored-By: Claude <a@b>';
  assert.strictEqual(lib.parseStamp(quoted).found, false);
});

test('git comment lines and trailing blanks are ignored', () => {
  assert.strictEqual(lib.parseStamp('Fix\n\nVerified: lint\n# Please enter\n\n').tokens[0], 'lint');
});

test('isAgentCommit matches the trailer in the last paragraph only', () => {
  const p = lib.DEFAULTS.agentTrailer;
  assert.ok(lib.isAgentCommit('x\n\nCo-Authored-By: Claude Opus <noreply@anthropic.com>', p));
  assert.ok(!lib.isAgentCommit('x\n\nCo-Authored-By: Pat <p@x.com>', p));
  assert.ok(!lib.isAgentCommit('Co-Authored-By: Claude <a@b>\n\nlater text', p));
  assert.ok(!lib.isAgentCommit('x\n\nCo-Authored-By: Claude', '('));
});

test('isDocsOnly needs at least one file and all docs', () => {
  const skip = ['**/*.md', 'docs/**'];
  assert.ok(lib.isDocsOnly(['README.md', 'docs/a.png'], skip));
  assert.ok(!lib.isDocsOnly(['README.md', 'src/a.js'], skip));
  assert.ok(!lib.isDocsOnly([], skip));
});

test('markerValid checks sha and age', () => {
  const now = Date.parse('2026-11-18T12:00:00Z');
  const m = { sha: 'abc', time: '2026-11-18T11:30:00Z' };
  assert.ok(lib.markerValid(m, 'abc', now, 120));
  assert.ok(!lib.markerValid(m, 'def', now, 120));
  assert.ok(!lib.markerValid(m, 'abc', now, 10));
  assert.ok(!lib.markerValid(null, 'abc', now, 120));
  assert.ok(!lib.markerValid({ sha: 'abc', time: 'nope' }, 'abc', now, 120));
});

test('mergeConfig defaults provenTokens to the full token', () => {
  assert.deepStrictEqual(lib.mergeConfig({ fullToken: 'gate' }).provenTokens, ['gate']);
  assert.deepStrictEqual(lib.mergeConfig({ provenTokens: ['a', 'b'] }).provenTokens, ['a', 'b']);
  assert.strictEqual(lib.mergeConfig({}).mode, 'observe');
});

test('configPaths order: env, repo, home', () => {
  const p = lib.configPaths('/r/app', { VERIFY_CONFIG: '/x.json' }, '/h');
  assert.deepStrictEqual(p, ['/x.json', '/r/app/.verify/config.json', '/h/.claude/verify-setup/app/config.json']);
});

test('parseArgs reads flags and values', () => {
  const a = lib.parseArgs(['--days', '3', 'x', '--json']);
  assert.strictEqual(a.days, '3');
  assert.strictEqual(a.json, true);
  assert.deepStrictEqual(a._, ['x']);
});
