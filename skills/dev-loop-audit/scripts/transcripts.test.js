// Run with: node --test skills/dev-loop-audit/scripts/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { rawCount, encodeProjectPath, projectFolders, newState, addRecord, buildCalls, compileConfig, tagCall } = require('./transcripts.js');

const win = { startIso: '2026-10-19T00:00:00.000Z', endIso: '2026-10-26T00:00:00.000Z' };
const use = (id, ts, name, input, extra = {}) => ({
  type: 'assistant', sessionId: 's1', timestamp: ts, cwd: '/r', gitBranch: 'main',
  message: { id: extra.msg || `m-${id}`, content: [{ type: 'tool_use', id, name, input }] }, ...extra.record,
});
const result = (id, ts, text, isError = false) => ({
  type: 'user', sessionId: 's1', timestamp: ts, message: { content: [{ type: 'tool_result', tool_use_id: id, content: text, is_error: isError }] },
});
const human = (ts, text, extra = {}) => ({ type: 'user', sessionId: 's1', timestamp: ts, origin: { kind: 'human' }, message: { content: text }, ...extra });

function parse(records, config = {}) {
  const state = newState();
  for (const r of records) addRecord(state, r, 'folder', 'f.jsonl', win);
  return { state, calls: buildCalls(state, compileConfig(config)) };
}

test('Claude Code encodes a project folder from its path', () => {
  assert.strictEqual(encodeProjectPath('/Users/me/dev/my.app'), '-Users-me-dev-my-app');
});

test('projectFolders: match texts, or the worktrees and folders nested in them', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-loop-audit-'));
  for (const n of ['-Users-me-app', '-Users-me-app--claude-worktrees-x', '-Users-me-app-two', '-Users-me-application', '-Users-me-other']) fs.mkdirSync(path.join(dir, n));
  assert.deepStrictEqual(projectFolders(dir, { worktrees: ['/Users/me/app'] }).sort(), ['-Users-me-app', '-Users-me-app--claude-worktrees-x']);
  assert.deepStrictEqual(projectFolders(dir, { match: ['other'], worktrees: [] }), ['-Users-me-other']);
});

test('pairs uses with results, de-duplicates replays, skips subagents and records outside the window', () => {
  const recs = [
    use('a', '2026-10-20T10:00:00.000Z', 'Bash', { command: 'ls' }),
    result('a', '2026-10-20T10:00:02.500Z', 'out'),
    use('a', '2026-10-21T10:00:00.000Z', 'Bash', { command: 'ls' }), // a resumed session replays it
    use('b', '2026-10-20T11:00:00.000Z', 'Bash', { command: 'pwd' }, { record: { isSidechain: true } }),
    use('c', '2026-10-18T11:00:00.000Z', 'Bash', { command: 'pwd' }),
  ];
  const { calls } = parse(recs);
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].tool_s, 2.5);
  assert.strictEqual(calls[0].res_head, 'out');
});

test('counts human messages, not tool results, meta records or context summaries', () => {
  const { state } = parse([
    human('2026-10-20T09:00:00.000Z', 'please fix it'),
    human('2026-10-20T09:01:00.000Z', 'x', { isMeta: true }),
    human('2026-10-20T09:02:00.000Z', 'This session is being continued from a previous conversation that ran out of context.'),
    { type: 'user', sessionId: 's1', timestamp: '2026-10-20T09:03:00.000Z', message: { content: 'old transcript, no origin' } },
    result('z', '2026-10-20T09:04:00.000Z', 'r'),
  ]);
  assert.strictEqual(state.humans.length, 2);
});

test('core tags: push, sleeps, loops, hooks', () => {
  const cfg = compileConfig({});
  const t = (cmd, extra = {}) => tagCall({ name: 'Bash', cmd, ...extra }, cfg);
  assert.ok(t('git push origin main | tail -3').includes('piped_push'));
  assert.ok(!t('git push > $f 2>&1; echo "exit $?"; tail -3 $f').includes('piped_push'));
  assert.ok(!t('git push || echo failed').includes('piped_push'));
  assert.ok(t('git push origin main 2>&1 | tail -3').includes('piped_push'));
  assert.ok(!t('git push && git log | head -1').includes('piped_push'));
  assert.ok(t('git push --no-verify').includes('no_verify'));
  assert.ok(!t("python3 - <<'EOF'\nwhile True:\n    break\nEOF\necho ok").includes('loop'));
  assert.ok(t('sleep 5').includes('sleep_only'));
  assert.ok(t('until curl -s localhost:3000; do sleep 1; done').includes('loop_unbounded'));
  assert.ok(!t('for i in $(seq 1 30); do until x; do :; done; done').includes('loop_unbounded'));
  assert.ok(t('grep -n "git push" docs/x.md').includes('git_push') === false);
  assert.ok(t('npm test', { is_error: true, res_head: 'PreToolUse:Bash hook error: no' }).includes('hook_refused'));
  const rec = { name: 'Bash', cmd: 'npm run build && sleep 10 && sleep 2' };
  tagCall(rec, cfg);
  assert.strictEqual(rec.sleep_nominal_s, 12);
});

test('mobile tags only with the mobile add-on', () => {
  const off = compileConfig({});
  const on = compileConfig({ addons: ['mobile'] });
  const tap = { name: 'mcp__Claude_Code_iOS_Simulator__control', action: 'tap' };
  assert.deepStrictEqual(tagCall({ ...tap }, off), []);
  assert.deepStrictEqual(tagCall({ ...tap }, on).sort(), ['input', 'qa', 'sim_tool']);
  assert.ok(tagCall({ name: 'Bash', cmd: 'xcrun simctl io booted screenshot /tmp/a.png' }, on).includes('screen_seen'));
  assert.ok(tagCall({ name: 'Bash', cmd: 'npx expo run:ios --device X' }, on).includes('native_run'));
  assert.ok(tagCall({ name: 'Read', path: '/tmp/shot.png' }, on).includes('screen_seen'));
});

test('web tags only with the web add-on', () => {
  const on = compileConfig({ addons: ['web'] });
  assert.ok(tagCall({ name: 'mcp__Claude_Browser__computer', action: 'left_click' }, on).includes('input'));
  assert.ok(tagCall({ name: 'mcp__Claude_Browser__computer', action: 'screenshot' }, on).includes('screen_seen'));
  assert.ok(tagCall({ name: 'mcp__playwright__browser_click' }, on).includes('input'));
  assert.ok(tagCall({ name: 'mcp__Claude_Browser__read_page' }, on).includes('page_read'));
  assert.ok(tagCall({ name: 'Bash', cmd: 'npm run dev' }, on).includes('dev_server'));
  assert.ok(tagCall({ name: 'Bash', cmd: 'npx playwright test' }, on).includes('browser_test'));
  assert.ok(!tagCall({ name: 'Bash', cmd: 'npx vite build' }, on).includes('dev_server'));
});

test('the config adds the repo\'s own helpers and screen reads', () => {
  const cfg = compileConfig({
    addons: ['mobile'],
    screenReads: 'shot.*\\.png$',
    gate: { commands: ['npm run validate'] },
    tags: [{ pattern: 'npm run shot', tags: ['screenshot', 'shot'] }, { pattern: 'npm run up', tags: ['helper', 'helper_start'] }],
  });
  assert.deepStrictEqual(tagCall({ name: 'Bash', cmd: 'npm run shot' }, cfg).sort(), ['qa', 'screenshot', 'shot']);
  assert.ok(tagCall({ name: 'Bash', cmd: 'npm run up' }, cfg).includes('helper_start'));
  assert.ok(tagCall({ name: 'Bash', cmd: 'npm run validate' }, cfg).includes('gate'));
  assert.ok(!tagCall({ name: 'Read', path: '/tmp/figma.png' }, cfg).includes('screen_seen'));
  assert.ok(!tagCall({ name: 'Bash', cmd: 'grep "npm run shot" README.md' }, cfg).includes('shot'));
});

test('rawCount, the cross-check, counts main-thread calls in the window once each', async () => {
  const lines = [
    use('a', '2026-10-20T10:00:00Z', 'Bash', { command: 'ls' }),
    use('a', '2026-10-20T10:00:00Z', 'Bash', { command: 'ls' }), // replayed on resume
    use('b', '2026-10-20T10:01:00Z', 'Read', {}),
    use('c', '2026-10-20T10:02:00Z', 'Bash', {}, { record: { isSidechain: true } }),
    use('d', '2026-10-27T10:00:00Z', 'Bash', {}), // after the window
  ];
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dev-loop-audit-')), 's1.jsonl');
  fs.writeFileSync(file, lines.map((l) => JSON.stringify(l)).join('\n'));
  const w = { start: new Date(win.startIso), end: new Date(win.endIso) };
  assert.strictEqual(await rawCount(file, w), 2);
});

const mobile = { addons: ['mobile'] };
const tagsOf = (cmd, config = mobile) => parse([use('x', '2026-10-20T10:00:00.000Z', 'Bash', { command: cmd }), result('x', '2026-10-20T10:00:01.000Z', 'ok')], config).calls[0];

test('axe touch is an input, and every input command in one call counts', () => {
  const touch = tagsOf('axe touch -x 10 -y 20 --down --up --udid ABC');
  assert.ok(touch.tags.includes('input') && touch.tags.includes('axe'));
  assert.strictEqual(touch.inputs, 1);
  const two = tagsOf('axe tap -x 1 -y 2 --udid A && axe tap -x 3 -y 4 --udid A');
  assert.strictEqual(two.inputs, 2);
  const mixed = tagsOf('axe tap -x 1 -y 2 --udid A; axe describe-ui --udid A');
  assert.strictEqual(mixed.inputs, 1);
  assert.ok(mixed.tags.includes('ax_read'));
});

test('a subagent hand-back is recorded apart from the person', () => {
  const { state } = parse([
    human('2026-10-20T09:00:00.000Z', 'go'),
    { type: 'user', sessionId: 's1', timestamp: '2026-10-20T09:05:00.000Z', origin: { kind: 'task-notification' }, message: { content: '<task-notification>done</task-notification>' } },
    { type: 'user', sessionId: 's1', timestamp: '2026-10-20T09:06:00.000Z', message: { content: '<task-notification>old shape, no origin</task-notification>' } },
  ]);
  assert.strictEqual(state.humans.length, 1);
  assert.strictEqual(state.agentEvents.length, 2);
});

test('git push inside a heredoc body or a quoted string is not a push', () => {
  assert.ok(tagsOf('git push origin main').tags.includes('git_push'));
  assert.ok(!tagsOf("python3 - <<'EOF'\nprint('run git push later')\nEOF").tags.includes('git_push'));
  assert.ok(!tagsOf('git commit -m "docs: say git push first"').tags.includes('git_push'));
  assert.ok(!tagsOf('echo \'git push | tail\'').tags.includes('piped_push'));
  // the opener line and what follows the heredoc are still real
  assert.ok(tagsOf("python3 - <<'EOF' && git push\nprint(1)\nEOF").tags.includes('git_push'));
  assert.ok(tagsOf("python3 - <<'EOF'\ntext\nEOF\ngit push origin main | tail -3").tags.includes('piped_push'));
});

test('a while-read loop fed by a file is bounded; a bare while is not', () => {
  const bounded = tagsOf('while read -r l; do echo "$l"; done < list.txt');
  assert.ok(bounded.tags.includes('loop') && !bounded.tags.includes('loop_unbounded'));
  assert.ok(!tagsOf('cat list | while IFS= read -r l; do echo "$l"; done').tags.includes('loop_unbounded'));
  assert.ok(tagsOf('while ! curl -s localhost:3000; do sleep 2; done').tags.includes('loop_unbounded'));
  assert.ok(tagsOf('while read x; do y; done < f; until ok; do sleep 1; done').tags.includes('loop_unbounded'));
});
