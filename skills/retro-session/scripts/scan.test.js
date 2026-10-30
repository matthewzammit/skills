// Run with: node --test skills/retro-session/scripts/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const { newState, addRecord, summary, redact } = require('./scan.js');

const use = (id, command, ts = '2026-10-30T10:00:00Z') => ({
  type: 'assistant',
  timestamp: ts,
  message: { content: [{ type: 'tool_use', id, name: 'Bash', input: { command } }] },
});
const result = (id, text, isError = false, ts = '2026-10-30T10:00:01Z') => ({
  type: 'user',
  timestamp: ts,
  message: { content: [{ type: 'tool_result', tool_use_id: id, is_error: isError, content: text }] },
});
const scan = (records, opts) => {
  const st = newState(opts);
  for (const r of records) addRecord(st, r);
  return summary(st);
};

test('a zsh glob failure counts as hidden, even when the result is not marked as an error', () => {
  const s = scan([use('a', 'grep -rn x src --include=*.tsx; ls'), result('a', '(eval):1: no matches found: --include=*.tsx\nfile.ts')]);
  assert.strictEqual(s.silentFailures[0].what, 'zsh: unmatched glob, the command did not run');
  assert.strictEqual(s.silentFailures[0].unflagged, 1);
  assert.strictEqual(s.flaggedErrors.length, 0);
});

test('stop-hook messages that differ only by numbers group as one guardrail', () => {
  const stop = (n) => ({ type: 'user', timestamp: '2026-10-30T10:00:00Z', message: { content: `Stop hook feedback:\nClickUp check: PR #${n} is open` } });
  const s = scan([stop(391), stop(392), stop(398)]);
  assert.strictEqual(s.guardrails.length, 1);
  assert.strictEqual(s.guardrails[0].count, 3);
  assert.strictEqual(s.humans.length, 0);
});

test('a denial counts only when the result starts with it, not when a log quotes it', () => {
  const s = scan([
    use('a', 'cat >> ~/.zshrc'),
    result('a', 'Permission for this action was denied by the Claude Code auto mode classifier.', true),
    use('b', 'python3 scan.py'),
    result('b', `${'x'.repeat(300)} Permission for this action was denied`),
  ]);
  assert.strictEqual(s.guardrails.length, 1);
  assert.match(s.guardrails[0].what, /^permission denied/);
});

test('a replayed history counts each call once, and --since drops what came before', () => {
  const records = [use('a', 'npm test', '2026-10-01T10:00:00Z'), result('a', 'fail', true, '2026-10-01T10:00:01Z'), use('b', 'npm test'), result('b', 'fail', true)];
  assert.strictEqual(scan([...records, ...records]).flaggedErrors[0].count, 2);
  assert.strictEqual(scan(records, { since: '2026-10-30T00:00:00Z' }).flaggedErrors[0].count, 1);
});

test('the same command 3 times is a repeat; subagent records are left out', () => {
  const s = scan([use('a', 'npm run sim:shot'), use('b', 'npm run sim:shot'), use('c', 'npm run sim:shot'), { ...use('d', 'npm run sim:shot'), isSidechain: true }]);
  assert.deepStrictEqual(s.repeats, [{ command: 'npm run sim:shot', count: 3 }]);
});

test('secrets are masked', () => {
  assert.strictEqual(redact('token=abcdefgh12345678'), 'token=<secret>');
  assert.strictEqual(redact(`key ghp_${'a'.repeat(30)}`), 'key <secret>');
});
