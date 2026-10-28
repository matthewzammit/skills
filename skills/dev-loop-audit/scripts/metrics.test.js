// Run with: node --test skills/dev-loop-audit/scripts/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { compute, trendRow, appendTrend, unionMin, shape, TREND_COLUMNS } = require('./metrics.js');

const t = (sec) => new Date(Date.UTC(2026, 9, 20, 10, 0, 0) + sec * 1000).toISOString();
let n = 0;
const call = (startS, endS, extra = {}) => ({
  id: `c${n++}`, session: extra.session || 'sess-0001', msg: extra.msg || `m${n}`, name: 'Bash', ts_use: t(startS),
  ts_res: endS == null ? null : t(endS), tool_s: endS == null ? null : endS - startS, tags: [], ...extra,
});
const data = (calls, humans = [], addons = ['mobile']) => ({
  window: { from: '2026-10-19', to: '2026-10-26', start_utc: '2026-10-19T00:00:00.000Z', end_utc: '2026-10-26T00:00:00.000Z' },
  addons, calls, humans, counts: {}, sessions: { 'sess-0001': { folder: 'f', branch: 'main', n_human: humans.length } },
});

test('wall time is the union of intervals, not their sum', () => {
  assert.strictEqual(unionMin([{ t0: 0, t1: 60000 }, { t0: 30000, t1: 90000 }, { t0: 120000, t1: 180000 }]), 2.5);
});

test('model time skips gaps over 10 minutes and gaps with a human message', () => {
  const M = compute(data([
    call(0, 10), call(40, 50), // 30 s gap: counted
    call(1000, 1010), // 950 s gap: too long
    call(1100, 1110), // 90 s gap, but a human wrote at 1050
    call(1200, 1210), // 90 s: counted
  ], [{ session: 'sess-0001', ts: t(1050) }]));
  assert.strictEqual(M.agent.model_min, 2);
  assert.strictEqual(M.agent.calls, 5);
});

test('check steps: input to the first screen seen, batched when the look shares the message', () => {
  const M = compute(data([
    call(0, 2, { msg: 'A', tags: ['input', 'qa'] }),
    call(2, 5, { msg: 'A', tags: ['screenshot', 'qa'] }),
    call(5, 6, { msg: 'A', tags: ['screen_seen', 'qa'] }), // seen 6 s after the tap
    call(20, 22, { msg: 'B', tags: ['input', 'qa'] }),
    call(30, 34, { msg: 'C', tags: ['screen_seen', 'screenshot', 'qa'] }), // seen 14 s after, not batched
  ]));
  assert.strictEqual(M.qa.inputs, 2);
  assert.strictEqual(M.qa.check_steps_n, 2);
  assert.strictEqual(M.qa.check_step_batched_median_s, 6);
  assert.strictEqual(M.qa.check_step_unbatched_median_s, 14);
  assert.strictEqual(M.qa.batched_step_share, 0.5);
});

test('a retry is the same failed command run again soon after', () => {
  const M = compute(data([
    call(0, 5, { cmd: 'npm test', is_error: true, res_head: 'Exit code 1' }),
    call(10, 15, { cmd: 'npm test' }),
    call(20, 25, { cmd: 'npm run build' }),
    call(30, 35, { cmd: 'npm run build' }), // the first one passed: not a retry
  ]));
  assert.strictEqual(M.agent.retries, 1);
});

test('pushes: refused by a hook, ran, failed', () => {
  const M = compute(data([
    call(0, 1, { cmd: 'git push | tail', tags: ['git_push', 'piped_push', 'hook_refused'], is_error: true, res_head: 'hook error' }),
    call(10, 25, { cmd: 'git push', tags: ['git_push'] }),
    call(30, 34, { cmd: 'git push', tags: ['git_push'], res_head: 'error: failed to push some refs to origin' }),
  ]));
  assert.strictEqual(M.gate.push_refused_by_hook, 1);
  assert.strictEqual(M.gate.push_ran, 2);
  assert.strictEqual(M.gate.push_failed_n, 1);
  assert.strictEqual(M.gate.push_median_s, 9.5);
});

test('setup is the QA tools\' time before the first input; cold when a build ran first', () => {
  const M = compute(data([
    call(0, 100, { tags: ['native', 'qa'] }),
    call(120, 122, { tags: ['input', 'qa'] }),
    call(5000, 5002, { tags: ['screenshot', 'qa'] }), // a new episode (over 20 min later)
    call(5600, 5610, { tags: ['helper', 'helper_start', 'qa'] }), // a quick start helper: warm; 10 min of coding before it
    call(5620, 5622, { tags: ['input', 'qa'] }),
  ]));
  assert.strictEqual(M.qa.episodes, 2);
  assert.strictEqual(M.qa.setup_median_cold_s, 100);
  assert.strictEqual(M.qa.setup_median_warm_s, 12);
  assert.strictEqual(M.qa.episode_rows[1].span_s, 620);
});

test('time waiting on the person is left out of tool and wall time', () => {
  const M = compute(data([
    call(0, 10),
    call(20, 320, { name: 'AskUserQuestion' }),
    call(330, 4330, { name: 'mcp__browser__preview_start', tags: ['qa'] }), // a permission prompt left open
    call(4340, 4350),
  ]));
  assert.strictEqual(M.agent.wall_min, round2(20 / 60));
  assert.strictEqual(M.agent.person_waits, 2);
  assert.strictEqual(M.agent.calls_over_60s, 0);
  assert.strictEqual(M.qa.wall_min, 0);
});
const round2 = (x) => Math.round(x * 10) / 10;

test('command shapes drop the cd prefix, ids and numbers', () => {
  assert.strictEqual(shape('cd /a/b && npm run test -- --shard 2'), 'npm run test -- --shard N');
  assert.strictEqual(shape('X=1; sleep 30'), 'sleep N');
  assert.strictEqual(shape('cd "/a b/c" && npm run lint'), 'npm run lint');
});

test('the trend row has one value per column, and appending replaces the same week', () => {
  const M = compute(data([call(0, 10)]), { summary: { runs: 4, failed: 1, flaky: 0, holes: 0, run_median_s: 90, billed_min: 8 } });
  const row = trendRow(M);
  assert.strictEqual(row.split(',').length, TREND_COLUMNS.length);
  assert.ok(row.startsWith('2026-10-19,7,4,1,0,0,90,'));
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dev-loop-audit-')), 'trend.csv');
  appendTrend(file, row);
  appendTrend(file, row);
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
  assert.strictEqual(lines.length, 2);
  assert.strictEqual(lines[0], TREND_COLUMNS.join(','));
});
