// Run with: node --test skills/ci-audit/scripts/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { encodeProjectPath, projectFolders, newState, addRecord, buildCalls, compileConfig, tagCall } = require('./transcripts.js');

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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-audit-'));
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
  assert.ok(t('git push --no-verify').includes('no_verify'));
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
