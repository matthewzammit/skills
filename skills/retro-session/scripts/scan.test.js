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

test('failure text that a command only printed, inside a quoted log line, is not counted', () => {
  const quoted = "('Python traceback', 25, 19), ('command not found', 10, 9)\n\"Exit code 1\\n(eval):1: no matches found: --include=*.ts\"";
  const s = scan([use('a', 'python3 read-log.py'), result('a', quoted)]);
  assert.strictEqual(s.silentFailures.length, 0);
});

test('real shell failures are counted, each in the form the shell prints', () => {
  const out = 'zsh: command not found: foo\nTraceback (most recent call last):\nls: x.md: No such file or directory\nfatal: not a git repository';
  const s = scan([use('a', 'foo; python3 x.py; ls x.md; git status'), result('a', out)]);
  assert.deepStrictEqual(s.silentFailures.map((f) => f.what).sort(), ['Python traceback', 'command not found', 'git fatal', 'missing file or folder']);
});

test('a hook counts when its own message starts the result, not when output mentions hooks', () => {
  const s = scan([
    use('a', 'git push | tail'),
    result('a', 'PreToolUse:Bash hook error: A piped git push hides a failed pre-push gate', true),
    use('b', 'grep -n Stop scan.js'),
    result('b', '124: if (/^Stop hook feedback:/.test(content)) bump(st.guardrails)'),
  ]);
  assert.strictEqual(s.guardrails.length, 1);
  assert.match(s.guardrails[0].what, /^hook: PreToolUse/);
});

test('commands that only share a long first part are not repeats', () => {
  const head = `cd /a/very/long/path/that/every/command/starts/with; S=${'x'.repeat(150)};`;
  const s = scan([use('a', `${head} npm test`), use('b', `${head} git push`), use('c', `${head} ls`)]);
  assert.deepStrictEqual(s.repeats, []);
});

test("pictures, a loaded skill's text, a resumed session's summary and a subagent's report are not the person's messages", () => {
  const typed = (text) => ({ type: 'user', timestamp: '2026-10-30T10:00:00Z', message: { content: [{ type: 'text', text }] } });
  const s = scan([
    typed('[Image: original 2560x880]'),
    typed('Base directory for this skill: /x\n# Session retro'),
    typed('This session is being continued from a previous conversation that ran out of context.'),
    typed('Another Claude session sent a message: <agent-message from="a3e0"> [Subagent hand-back] The text below'),
    typed('go ahead and merge'),
  ]);
  assert.deepStrictEqual(s.humans.map((h) => h.text), ['go ahead and merge']);
});

// Unproven work: build a session from a list of steps, in order.
const edit = (id, file, newText = 'x', oldText = 'y') => ({
  type: 'assistant',
  timestamp: '2026-10-30T10:00:00Z',
  message: { content: [{ type: 'tool_use', id, name: 'Edit', input: { file_path: file, old_string: oldText, new_string: newText } }] },
});
const write = (id, file, content) => ({
  type: 'assistant',
  timestamp: '2026-10-30T10:00:00Z',
  message: { content: [{ type: 'tool_use', id, name: 'Write', input: { file_path: file, content } }] },
});
const person = (text) => ({ type: 'user', timestamp: '2026-10-30T10:00:02Z', message: { content: text } });

test('a commit with no check since the last edit is counted', () => {
  const s = scan([edit('e', 'src/a.ts'), use('c', 'git add -A && git commit -m "fix a"'), result('c', 'ok')]);
  assert.strictEqual(s.uncheckedCommits[0].count, 1);
  assert.match(s.uncheckedCommits[0].examples[0], /git commit/);
});

test('a commit after a check, in an earlier call or in the same chain, is not counted', () => {
  const earlier = scan([edit('e', 'src/a.ts'), use('t', 'npm test'), result('t', 'ok'), use('c', 'git commit -m "fix a"'), result('c', 'ok')]);
  assert.strictEqual(earlier.uncheckedCommits.length, 0);
  const chained = scan([edit('e', 'src/a.ts'), use('c', 'npm run lint && git commit -m "fix a"'), result('c', 'ok')]);
  assert.strictEqual(chained.uncheckedCommits.length, 0);
});

test('an edit after the check makes the next commit unchecked; a doc-only edit and a quoted word do not', () => {
  const s = scan([
    edit('e1', 'src/a.ts'), use('t', 'npx jest'), result('t', 'ok'),
    edit('e2', 'src/a.ts'), use('c', 'git commit -m "fix a"'), result('c', 'ok'),
  ]);
  assert.strictEqual(s.uncheckedCommits[0].count, 1);
  const docs = scan([edit('e', 'docs/readme.md'), use('c', 'git commit -m "docs"'), result('c', 'ok')]);
  assert.strictEqual(docs.uncheckedCommits.length, 0);
  const quoted = scan([edit('e', 'src/a.ts'), use('c', 'git commit -m "npm test passes; ran npm run lint"'), result('c', 'ok')]);
  assert.strictEqual(quoted.uncheckedCommits[0].count, 1);
  const noEdit = scan([use('c', 'git commit --amend --no-edit'), result('c', 'ok')]);
  assert.strictEqual(noEdit.uncheckedCommits.length, 0);
});

test('a check that fails then passes with no edit between is a re-run until green', () => {
  const s = scan([
    edit('e', 'src/a.ts'),
    use('t1', 'npm test'), result('t1', 'Exit code 1\nfail', true),
    use('t2', 'npm test'), result('t2', 'pass'),
  ]);
  assert.strictEqual(s.rerunsUntilGreen[0].count, 1);
  assert.strictEqual(s.rerunsUntilGreen[0].what, 'npm test');
});

test('a fail, an edit, then a pass is a fix, not a re-run', () => {
  const s = scan([
    use('t1', 'npm test'), result('t1', 'fail', true),
    edit('e', 'src/a.ts'),
    use('t2', 'npm test'), result('t2', 'pass'),
  ]);
  assert.strictEqual(s.rerunsUntilGreen.length, 0);
});

test('the same check failing 4 times with edits between, nobody asked, is a fix loop', () => {
  const round = (n, id) => [edit(`e${id}`, 'src/a.ts', `v${n}`), use(`t${id}`, 'npm test'), result(`t${id}`, 'fail', true)];
  const s = scan([...round(1, 1), ...round(2, 2), ...round(3, 3), ...round(4, 4), ...round(5, 5)]);
  assert.strictEqual(s.fixLoops.length, 1);
  assert.strictEqual(s.fixLoops[0].count, 1);
  assert.match(s.fixLoops[0].examples[0], /failed 5 times in a row/);
});

test('3 failing rounds, a pass in the middle, a question to the person, or no edits between are not a fix loop', () => {
  const round = (id) => [edit(`e${id}`, 'src/a.ts', `v${id}`), use(`t${id}`, 'npm test'), result(`t${id}`, 'fail', true)];
  assert.strictEqual(scan([...round(1), ...round(2), ...round(3)]).fixLoops.length, 0);
  const pass = [use('p', 'npm test'), result('p', 'ok')];
  assert.strictEqual(scan([...round(1), ...round(2), ...round(3), ...pass, ...round(4), ...round(5)]).fixLoops.length, 0);
  const asked = scan([...round(1), ...round(2), ...round(3), person('which one do you want?'), ...round(4)]);
  assert.strictEqual(asked.fixLoops.length, 0);
  const sameEdit = [edit('e', 'src/a.ts'), ...[1, 2, 3, 4, 5].flatMap((n) => [use(`t${n}`, 'npm test'), result(`t${n}`, 'fail', true)])];
  assert.strictEqual(scan(sameEdit).fixLoops.length, 0);
});

test('a sleep or retry added to a test file is counted, in an Edit or a Write', () => {
  const s = scan([
    edit('a', 'src/data/foo.test.ts', 'await new Promise((r) => setTimeout(r, 500));'),
    write('b', 'tests/test_sync.py', 'import time\ndef test_x():\n    time.sleep(2)\n'),
    edit('c', 'src/data/bar.spec.ts', 'jest.retryTimes(3);'),
    edit('d', 'src/data/baz.test.ts', 'await retry(() => expect(x).toBe(1));'),
  ]);
  assert.strictEqual(s.testSleeps.length, 4);
  assert.match(s.testSleeps.map((r) => r.examples[0]).join('\n'), /adds setTimeout/);
});

test('a sleep in a source file, a test that keeps an old sleep, or plain test text is not counted', () => {
  const s = scan([
    edit('a', 'src/data/foo.ts', 'await sleep(500)'),
    edit('b', 'src/data/foo.test.ts', 'await sleep(500); // renamed', 'await sleep(500);'),
    edit('c', 'src/data/foo.test.ts', 'expect(total).toBe(3);'),
  ]);
  assert.strictEqual(s.testSleeps.length, 0);
});

test('a replayed history counts unproven work once', () => {
  const records = [
    edit('e', 'src/a.test.ts', 'setTimeout(r, 5)'),
    use('c', 'git commit -m "x"'), result('c', 'ok'),
    use('t1', 'npm test'), result('t1', 'fail', true),
    use('t2', 'npm test'), result('t2', 'ok'),
  ];
  const s = scan([...records, ...records]);
  assert.strictEqual(s.uncheckedCommits[0].count, 1);
  assert.strictEqual(s.rerunsUntilGreen[0].count, 1);
  assert.strictEqual(s.testSleeps[0].count, 1);
});
