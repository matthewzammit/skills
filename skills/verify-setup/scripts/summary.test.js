const test = require('node:test');
const assert = require('node:assert');
const { parseLog, summarize, formatSummary } = require('./summary.js');
const { withMarker } = require('./mark-pass.js');

const now = Date.parse('2026-11-18T12:00:00Z');
const row = (time, status, tokens = '', action = 'pass', unproven = '') => [time, 'abc', status, 'observe', action, tokens, unproven, 's', ''].join('\t');
const log = [
  row('2026-11-17T10:00:00Z', 'ok', 'lint,test'),
  row('2026-11-16T10:00:00Z', 'ok', 'lint,full'),
  row('2026-11-15T10:00:00Z', 'unstamped'),
  row('2026-11-14T10:00:00Z', 'unproven', 'full', 'pass', 'full'),
  row('2026-11-13T10:00:00Z', 'none'),
  row('2026-11-12T10:00:00Z', 'skipped'),
  row('2026-10-01T10:00:00Z', 'ok', 'lint'),
  'garbage line',
].join('\n');

test('summarize counts each status for the window', () => {
  const s = summarize(parseLog(log), 7, now);
  assert.strictEqual(s.commits, 6);
  assert.strictEqual(s.agentCommits, 5);
  assert.strictEqual(s.ok, 2);
  assert.strictEqual(s.unstamped, 1);
  assert.strictEqual(s.unproven, 1);
  assert.strictEqual(s.none, 1);
  assert.strictEqual(s.perToken.lint, 2);
  assert.strictEqual(s.perToken.full, 2);
});

test('a longer window includes older commits', () => {
  assert.strictEqual(summarize(parseLog(log), 90, now).commits, 7);
});

test('formatSummary prints every count and handles an empty log', () => {
  assert.match(formatSummary(summarize(parseLog(log), 7, now)), /stamped ok: 2/);
  assert.match(formatSummary(summarize([], 7, now)), /\(none yet\)/);
});

test('withMarker adds one token and keeps the rest', () => {
  const m = withMarker({ lint: { sha: 'a', time: 't' } }, 'full', 'abc', now);
  assert.strictEqual(m.full.sha, 'abc');
  assert.strictEqual(m.full.time, '2026-11-18T12:00:00.000Z');
  assert.ok(m.lint);
  assert.deepStrictEqual(Object.keys(withMarker(null, 'full', 'x', now)), ['full']);
});
