#!/usr/bin/env node
/**
 * One set of numbers from calls.json (transcripts.js) and ci.json (ci-runs.js), so every part of the report
 * agrees. Writes metrics.json, prints a text summary, and prints (or appends) this window's trend row.
 *
 *   node metrics.js --calls calls.json [--ci ci.json] --out metrics.json
 *   node metrics.js ... --append-trend <records>/trend.csv     after the findings are verified
 *
 * The rules (references/checks-agent-time.md):
 * - Wall time is the union of tool intervals per session: calls in one message overlap, so a plain sum
 *   double-counts.
 * - Model time is the gap from a result to the next tool call in the same session, kept only when it is under
 *   10 minutes and no human message falls in between.
 * - A call that waits on the person (a question, a plan to approve) or runs over 30 minutes (a permission prompt
 *   left open) is person time: it is left out of tool and wall time and listed apart.
 * - A QA episode starts after 20 minutes with no QA call; setup is its start to its first input.
 * - A check step is an input to the first screen seen after it (no other input between, under 10 minutes).
 *   It is batched when the input's own message also took a screenshot or read the screen.
 */
const fs = require('node:fs');
const { parseArgs, median, p90, round, sum, countBy, ms } = require('./common.js');

const TREND_COLUMNS = [
  'week', 'days', 'ci_runs', 'ci_failed', 'ci_flaky', 'ci_holes', 'ci_run_median_s', 'ci_run_p90_s', 'ci_queue_median_s',
  'ci_billed_min', 'agent_sessions', 'agent_calls', 'agent_wall_min', 'agent_model_min', 'calls_over_60s_min',
  'sleep_only_calls', 'sleep_nominal_min', 'retries', 'hook_refusals', 'push_median_s', 'push_p90_s', 'push_failed',
  'gate_median_s', 'qa_inputs', 'qa_wall_min', 'qa_model_min', 'qa_per_input_s', 'check_step_median_s', 'batched_step_share',
];

const has = (r, t) => r.tags.includes(t);
const WAITS_ON_PERSON = new Set(['AskUserQuestion', 'ExitPlanMode']);
const STALLED_S = 1800;
const SEEN = (r) => has(r, 'screen_seen');
const LOOK_IN_MESSAGE = ['screenshot', 'ax_read', 'page_read'];

/** Minutes covered by the union of [t0, t1] intervals. */
function unionMin(rs) {
  const iv = rs.filter((r) => r.t1 != null && !r.wait).map((r) => [r.t0, r.t1]).sort((a, b) => a[0] - b[0]);
  let tot = 0;
  let cs = null;
  let ce = null;
  for (const [a, b] of iv) {
    if (cs === null) { cs = a; ce = b; } else if (a <= ce) ce = Math.max(ce, b); else { tot += ce - cs; cs = a; ce = b; }
  }
  if (cs !== null) tot += ce - cs;
  return tot / 60000;
}

/** Shape of a command for "what is typed again and again": no cd prefix, no variables, numbers and ids as N. */
function shape(cmd) {
  let c = String(cmd).trim().split('\n')[0];
  c = c.replace(/^(\s*(cd\s+("[^"]*"|'[^']*'|\S+)|[A-Z_][A-Z0-9_]*=\S*|export\s+\S+|set\s+-\S+)\s*(&&|;)\s*)+/, '');
  c = c.replace(/[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}/g, '<ID>');
  c = c.replace(/\/(private\/)?tmp\/\S*/g, '<tmp>').replace(/[0-9a-f]{7,40}\b/g, '<sha>').replace(/\d+/g, 'N');
  return c.slice(0, 60);
}

function compute(data, ci) {
  const calls = data.calls.map((r) => ({
    ...r, t0: ms(r.ts_use), t1: r.ts_res ? ms(r.ts_res) : null, wait: WAITS_ON_PERSON.has(r.name) || r.tool_s > STALLED_S,
  }));
  const bySession = new Map();
  for (const r of calls) {
    if (!bySession.has(r.session)) bySession.set(r.session, []);
    bySession.get(r.session).push(r);
  }
  for (const rs of bySession.values()) rs.sort((a, b) => a.t0 - b.t0);
  const humansBy = new Map();
  for (const h of data.humans) {
    if (!humansBy.has(h.session)) humansBy.set(h.session, []);
    humansBy.get(h.session).push(ms(h.ts));
  }

  function modelAfter(pred) {
    let tot = 0;
    let n = 0;
    for (const [s, rs] of bySession) {
      const hs = humansBy.get(s) || [];
      for (let i = 0; i < rs.length - 1; i++) {
        const r = rs[i];
        if (!pred(r) || r.t1 == null) continue;
        const nxt = rs[i + 1].t0;
        const gap = nxt - r.t1;
        if (gap <= 0 || gap > 600000) continue;
        if (hs.some((h) => r.t1 < h && h <= nxt)) continue;
        tot += gap;
        n++;
      }
    }
    return { min: round(tot / 60000, 1), gaps: n };
  }
  const toolS = (rs) => rs.filter((r) => !r.wait).map((r) => r.tool_s).filter((x) => x != null);
  const msgTags = (rs) => {
    const m = new Map();
    for (const r of rs) {
      if (!m.has(r.msg)) m.set(r.msg, new Set());
      for (const t of r.tags) m.get(r.msg).add(t);
    }
    return m;
  };
  const tail = (r) => `${r.res_head || ''}${r.res_tail || ''}${r.stdout_tail || ''}${r.stderr_tail || ''}`;

  // Agent time: every call.
  const long = calls.filter((r) => r.tool_s > 60 && !r.wait);
  const waits = calls.filter((r) => r.wait && r.tool_s != null);
  const agent = {
    sessions: bySession.size,
    calls: calls.length,
    humans: data.humans.length,
    tool_sum_min: round(sum(toolS(calls)) / 60, 1),
    wall_min: round(sum([...bySession.values()].map(unionMin)), 1),
    model_min: modelAfter(() => true).min,
    errors: calls.filter((r) => r.is_error).length,
    person_waits: waits.length,
    person_wait_min: round(sum(waits.map((r) => r.tool_s)) / 60, 1),
    person_wait_examples: waits.sort((a, b) => b.tool_s - a.tool_s).slice(0, 5).map((r) => ({ session: r.session.slice(0, 8), at: r.ts_use.slice(5, 16), s: Math.round(r.tool_s), what: r.name })),
    calls_over_60s: long.length,
    calls_over_60s_min: round(sum(long.map((r) => r.tool_s)) / 60, 1),
    long_calls: long.sort((a, b) => b.tool_s - a.tool_s).slice(0, 15).map((r) => ({
      session: r.session.slice(0, 8), at: r.ts_use.slice(5, 16), s: Math.round(r.tool_s), bg: Boolean(r.bg),
      what: (r.cmd || r.action || r.name).slice(0, 110).replace(/\n/g, ' '),
    })),
    sleep_only_calls: calls.filter((r) => has(r, 'sleep_only')).length,
    sleep_only_refused: calls.filter((r) => has(r, 'sleep_only') && r.sleep_refused).length,
    sleep_nominal_min: round(sum(calls.filter((r) => !r.sleep_refused).map((r) => r.sleep_nominal_s || 0)) / 60, 1),
    sleep_nominal_sleep_only_min: round(sum(calls.filter((r) => has(r, 'sleep_only') && !r.sleep_refused).map((r) => r.sleep_nominal_s || 0)) / 60, 1),
    loops_unbounded_over_60s: calls.filter((r) => has(r, 'loop_unbounded') && r.tool_s > 60).map((r) => ({
      session: r.session.slice(0, 8), at: r.ts_use.slice(5, 16), s: Math.round(r.tool_s), cmd: (r.cmd || '').slice(0, 100).replace(/\n/g, ' '),
    })),
    timeout_cmds: calls.filter((r) => has(r, 'timeout_cmd')).length,
    hook_refusals: calls.filter((r) => has(r, 'hook_refused')).length,
    hook_refusals_by_text: countBy(calls.filter((r) => has(r, 'hook_refused')), (r) => (r.res_head || '').replace(/\s+/g, ' ').slice(0, 90)),
    classifier_denials: calls.filter((r) => has(r, 'classifier_denied')).length,
    permission_denials: calls.filter((r) => has(r, 'permission_denied')).length,
    by_tool: Object.fromEntries(Object.entries(countBy(calls, (r) => r.name)).sort((a, b) => b[1] - a[1]).slice(0, 15)),
  };
  // Retries: a Bash command run again within 10 minutes after the same command failed.
  const retries = [];
  for (const rs of bySession.values()) {
    const recent = [];
    for (const r of rs) {
      if (r.name !== 'Bash' || !r.cmd) continue;
      const prev = recent.find((p) => p.cmd === r.cmd && r.t0 - p.t0 < 600000 && (p.is_error || /exit code [1-9]|FAILED|error:/i.test(p.res_head || '')));
      if (prev) retries.push(r);
      recent.unshift(r);
      if (recent.length > 3) recent.pop();
    }
  }
  agent.retries = retries.length;
  agent.retries_min = round(sum(toolS(retries)) / 60, 1);
  agent.retry_examples = retries.slice(0, 10).map((r) => ({ session: r.session.slice(0, 8), at: r.ts_use.slice(5, 16), s: Math.round(r.tool_s || 0), cmd: r.cmd.slice(0, 100).replace(/\n/g, ' ') }));
  agent.model_after_error_min = modelAfter((r) => r.is_error).min;
  agent.top_bash_shapes = Object.entries(countBy(calls.filter((r) => r.name === 'Bash' && r.cmd), (r) => shape(r.cmd)))
    .sort((a, b) => b[1] - a[1]).slice(0, 25);

  // Local gate: pushes (the hook runs inside them) and gate commands run by hand.
  const pushes = calls.filter((r) => has(r, 'git_push') && r.t1 != null);
  const refused = (r) => has(r, 'hook_refused');
  const ran = pushes.filter((r) => !refused(r));
  const pushFailed = (r) => /error: failed to push|\[rejected\]|hook declined|failed to push some refs/.test(tail(r));
  const gateRuns = calls.filter((r) => has(r, 'gate') && r.t1 != null && !r.bg && !has(r, 'git_push'));
  const timed = (t) => calls.filter((r) => has(r, t) && r.t1 != null && !r.bg && !has(r, 'gate') && !has(r, 'git_push')).map((r) => r.tool_s);
  const gate = {
    push_calls: pushes.length,
    push_refused_by_hook: pushes.length - ran.length,
    push_ran: ran.length,
    push_median_s: median(toolS(ran)),
    push_p90_s: p90(toolS(ran)),
    push_max_s: ran.length ? round(Math.max(...toolS(ran)), 1) : null,
    push_failed: ran.filter(pushFailed).map((r) => ({
      session: r.session.slice(0, 8), at: r.ts_use.slice(5, 16), s: Math.round(r.tool_s), id: r.id,
      tail: tail(r).replace(/\s+/g, ' ').slice(-240),
    })),
    no_verify: calls.filter((r) => has(r, 'no_verify')).length,
    piped_push_attempts: calls.filter((r) => has(r, 'piped_push')).length,
    gate_calls: gateRuns.length,
    gate_median_s: median(toolS(gateRuns)),
    gate_p90_s: p90(toolS(gateRuns)),
    gate_max_s: gateRuns.length ? round(Math.max(...toolS(gateRuns)), 1) : null,
    gate_failed: gateRuns.filter((r) => r.is_error || /exit code [1-9]/i.test(r.res_head || '')).length,
  };
  for (const k of ['typecheck', 'lint', 'test', 'install']) {
    const xs = timed(k);
    gate[`${k}_calls`] = xs.length;
    gate[`${k}_median_s`] = median(xs);
  }
  gate.push_failed_n = gate.push_failed.length;

  // QA: driving and watching a device or browser (mobile and web add-ons, and the config's helpers).
  const qaCalls = calls.filter((r) => has(r, 'qa'));
  const inputs = calls.filter((r) => has(r, 'input'));
  const qa = { addons: data.addons || [], calls: qaCalls.length, inputs: inputs.length };
  qa.wall_min = round(sum([...bySession.values()].map((rs) => unionMin(rs.filter((r) => has(r, 'qa'))))), 1);
  qa.tool_sum_min = round(sum(toolS(qaCalls)) / 60, 1);
  const qm = modelAfter((r) => has(r, 'qa'));
  qa.model_min = qm.min;
  qa.model_gaps = qm.gaps;
  qa.per_input_s = inputs.length ? round(((qa.wall_min + qa.model_min) * 60) / inputs.length, 1) : null;
  const steps = [];
  const batchedSteps = [];
  const unbatchedSteps = [];
  let batched = 0;
  for (const rs of bySession.values()) {
    const mt = msgTags(rs);
    rs.forEach((r, i) => {
      if (!has(r, 'input')) return;
      let seen = null;
      for (const q of rs.slice(i + 1)) {
        if (q.t0 - r.t0 > 600000 || has(q, 'input')) break;
        if (SEEN(q) && q.t1 != null) { seen = q.t1; break; }
      }
      const b = LOOK_IN_MESSAGE.some((t) => mt.get(r.msg).has(t));
      if (b) batched++;
      if (seen) {
        const dt = (seen - r.t0) / 1000;
        steps.push(dt);
        (b ? batchedSteps : unbatchedSteps).push(dt);
      }
    });
  }
  Object.assign(qa, {
    check_step_median_s: median(steps),
    check_steps_n: steps.length,
    check_step_batched_median_s: median(batchedSteps),
    check_step_unbatched_median_s: median(unbatchedSteps),
    batched_step_share: inputs.length ? round(batched / inputs.length, 2) : null,
    unbatched_inputs: inputs.length - batched,
    screenshots: calls.filter((r) => has(r, 'screenshot')).length,
    screen_reads: calls.filter((r) => has(r, 'screen_read')).length,
    relaunches: calls.filter((r) => has(r, 'relaunch') || has(r, 'hand_relaunch')).length,
    helper_calls: calls.filter((r) => has(r, 'helper')).length,
    qa_calls_over_120s: qaCalls.filter((r) => r.tool_s > 120).length,
    qa_calls_over_120s_min: round(sum(qaCalls.filter((r) => r.tool_s > 120).map((r) => r.tool_s)) / 60, 1),
    overhead_read_median_s: median(calls.filter((r) => r.name === 'Read').map((r) => r.tool_s)),
    overhead_input_median_s: median(toolS(inputs)),
  });
  let cons = 0;
  for (const rs of bySession.values()) {
    let last = null;
    for (const r of rs) {
      if (has(r, 'input')) last = 'input';
      else if (SEEN(r)) { if (last === 'shot') cons++; last = 'shot'; }
    }
  }
  qa.consecutive_screens = cons;
  // Setup: start of a QA episode to its first input. Cold when a build, install or helper start ran first.
  const setupWarm = [];
  const setupCold = [];
  const episodes = [];
  for (const [s, rs] of bySession) {
    const q = rs.filter((r) => has(r, 'qa'));
    let cur = [];
    const flush = () => {
      if (!cur.length) return;
      const first = cur.find((r) => has(r, 'input'));
      if (first) {
        const pre = cur.filter((r) => r.t0 < first.t0);
        const cold = pre.some((r) => has(r, 'native') || has(r, 'dev_server') || has(r, 'install') || has(r, 'helper_start'));
        const dt = (first.t0 - cur[0].t0) / 1000;
        (cold ? setupCold : setupWarm).push(dt);
        episodes.push({ session: s.slice(0, 8), at: cur[0].ts_use.slice(5, 16), setup_s: Math.round(dt), cold, calls: cur.length, inputs: cur.filter((r) => has(r, 'input')).length });
      }
      cur = [];
    };
    for (const r of q) {
      if (cur.length && r.t0 - cur[cur.length - 1].t0 > 1200000) flush();
      cur.push(r);
    }
    flush();
  }
  Object.assign(qa, {
    episodes: episodes.length, setup_median_warm_s: median(setupWarm), setup_median_cold_s: median(setupCold),
    setup_n_warm: setupWarm.length, setup_n_cold: setupCold.length, episode_rows: episodes,
  });

  const addons = new Set(data.addons || []);
  const mobile = addons.has('mobile') ? {
    sim_tool_calls: calls.filter((r) => has(r, 'sim_tool')).length,
    sim_tool_actions: countBy(calls.filter((r) => has(r, 'sim_tool')), (r) => r.action),
    simctl_calls: calls.filter((r) => has(r, 'simctl')).length,
    hand_relaunches: calls.filter((r) => has(r, 'hand_relaunch')).length,
    openurl: calls.filter((r) => has(r, 'openurl')).length,
    axe_calls: calls.filter((r) => has(r, 'axe')).length,
    adb_calls: calls.filter((r) => has(r, 'adb')).length,
    adb_input_calls: calls.filter((r) => has(r, 'adb_input')).length,
    native: Object.fromEntries(['native', 'native_run', 'xcodebuild', 'pod_install', 'prebuild', 'gradle', 'archive'].map((k) => {
      const xs = calls.filter((r) => has(r, k));
      return [k, { calls: xs.length, bg: xs.filter((r) => r.bg).length, median_s_fg: median(xs.filter((r) => !r.bg).map((r) => r.tool_s)), max_s_fg: xs.filter((r) => !r.bg && r.tool_s).length ? round(Math.max(...xs.filter((r) => !r.bg && r.tool_s).map((r) => r.tool_s)), 1) : null }];
    })),
  } : null;
  const web = addons.has('web') ? (() => {
    const tests = calls.filter((r) => has(r, 'browser_test') && !r.bg);
    const deploys = calls.filter((r) => has(r, 'preview_deploy') && !r.bg);
    return {
      browser_calls: calls.filter((r) => has(r, 'browser_tool')).length,
      browser_actions: countBy(calls.filter((r) => has(r, 'browser_tool')), (r) => r.action || r.name.split('__').pop()),
      page_reads: calls.filter((r) => has(r, 'page_read')).length,
      dev_server_starts: calls.filter((r) => has(r, 'dev_server')).length,
      dev_server_fg: calls.filter((r) => has(r, 'dev_server') && !r.bg).length,
      port_in_use: calls.filter((r) => has(r, 'port_in_use')).length,
      browser_tests: { calls: tests.length, median_s: median(toolS(tests)), p90_s: p90(toolS(tests)), failed: tests.filter((r) => r.is_error || /\d+ failed|failing/i.test(tail(r))).length },
      preview_deploys: { calls: deploys.length, median_s: median(toolS(deploys)), max_s: deploys.length ? round(Math.max(...toolS(deploys)), 1) : null },
    };
  })() : null;

  // The config's own tags, counted.
  const custom = {};
  const known = new Set(['input', 'qa', 'screenshot', 'screen_seen', 'helper', 'gate']);
  for (const r of calls) for (const t of r.tags) if (!known.has(t)) custom[t] = (custom[t] || 0) + 1;

  const perSession = {};
  for (const [s, rs] of bySession) {
    const mt = msgTags(rs);
    const ins = rs.filter((r) => has(r, 'input'));
    const b = ins.filter((r) => LOOK_IN_MESSAGE.some((t) => mt.get(r.msg).has(t))).length;
    const meta = data.sessions[s] || {};
    perSession[s.slice(0, 8)] = {
      folder: meta.folder, branch: meta.branch, calls: rs.length, humans: meta.n_human,
      wall_min: round(unionMin(rs), 1), qa_calls: rs.filter((r) => has(r, 'qa')).length, inputs: ins.length,
      batched_share: ins.length ? round(b / ins.length, 2) : null, qa_wall_min: round(unionMin(rs.filter((r) => has(r, 'qa'))), 1),
      sleep_only: rs.filter((r) => has(r, 'sleep_only')).length, hook_refusals: rs.filter((r) => has(r, 'hook_refused')).length,
      errors: rs.filter((r) => r.is_error).length, pushes: rs.filter((r) => has(r, 'git_push')).length,
    };
  }

  return { window: data.window, counts: data.counts, agent, gate, qa, mobile, web, custom_tags: custom, per_session: perSession, ci: ci ? ci.summary : null };
}

function trendRow(M) {
  const ci = M.ci || {};
  const days = Math.round((ms(M.window.end_utc) - ms(M.window.start_utc)) / 86400000);
  const v = {
    week: M.window.from, days, ci_runs: ci.runs, ci_failed: ci.failed, ci_flaky: ci.flaky, ci_holes: ci.holes,
    ci_run_median_s: ci.run_median_s, ci_run_p90_s: ci.run_p90_s, ci_queue_median_s: ci.queue_median_s, ci_billed_min: ci.billed_min,
    agent_sessions: M.agent.sessions, agent_calls: M.agent.calls, agent_wall_min: M.agent.wall_min, agent_model_min: M.agent.model_min,
    calls_over_60s_min: M.agent.calls_over_60s_min, sleep_only_calls: M.agent.sleep_only_calls, sleep_nominal_min: M.agent.sleep_nominal_min,
    retries: M.agent.retries, hook_refusals: M.agent.hook_refusals, push_median_s: M.gate.push_median_s, push_p90_s: M.gate.push_p90_s,
    push_failed: M.gate.push_failed_n, gate_median_s: M.gate.gate_median_s, qa_inputs: M.qa.inputs, qa_wall_min: M.qa.wall_min,
    qa_model_min: M.qa.model_min, qa_per_input_s: M.qa.per_input_s, check_step_median_s: M.qa.check_step_median_s,
    batched_step_share: M.qa.batched_step_share,
  };
  return TREND_COLUMNS.map((c) => (v[c] === null || v[c] === undefined ? '' : v[c])).join(',');
}

/** Append the row, writing the header first when the file is new. A row for the same week is replaced. */
function appendTrend(file, row) {
  const header = TREND_COLUMNS.join(',');
  let lines = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean) : [];
  if (lines.length && lines[0] !== header) throw new Error(`${file} has other columns; start a new file or add the new columns by hand`);
  if (!lines.length) lines = [header];
  const week = row.split(',')[0];
  lines = lines.filter((l, i) => i === 0 || l.split(',')[0] !== week);
  lines.push(row);
  fs.writeFileSync(file, `${lines.join('\n')}\n`);
}

function summary(M) {
  const out = [];
  const line = (k, v) => out.push(`${k}: ${typeof v === 'object' && v !== null ? JSON.stringify(v) : v}`);
  out.push(`# Window ${M.window.from} to ${M.window.to} (end exclusive)`, '', '## Agent');
  for (const [k, v] of Object.entries(M.agent)) if (!['person_wait_examples', 'long_calls', 'top_bash_shapes', 'retry_examples', 'loops_unbounded_over_60s', 'hook_refusals_by_text'].includes(k)) line(k, v);
  out.push('waits on the person (left out of tool and wall time):', ...M.agent.person_wait_examples.map((e) => `  ${JSON.stringify(e)}`));
  out.push('long calls:', ...M.agent.long_calls.map((e) => `  ${JSON.stringify(e)}`));
  out.push('retries:', ...M.agent.retry_examples.map((e) => `  ${JSON.stringify(e)}`));
  out.push('unbounded loops over 60 s:', ...M.agent.loops_unbounded_over_60s.map((e) => `  ${JSON.stringify(e)}`));
  out.push('hook refusals:', ...Object.entries(M.agent.hook_refusals_by_text).map(([k, v]) => `  ${v} x ${k}`));
  out.push('top command shapes:', ...M.agent.top_bash_shapes.map(([k, v]) => `  ${v} x ${k}`));
  out.push('', '## Gate');
  for (const [k, v] of Object.entries(M.gate)) if (k !== 'push_failed') line(k, v);
  out.push('failed pushes:', ...M.gate.push_failed.map((e) => `  ${JSON.stringify(e)}`));
  out.push('', '## QA');
  for (const [k, v] of Object.entries(M.qa)) if (k !== 'episode_rows') line(k, v);
  out.push('episodes:', ...M.qa.episode_rows.map((e) => `  ${JSON.stringify(e)}`));
  if (M.mobile) { out.push('', '## Mobile'); for (const [k, v] of Object.entries(M.mobile)) line(k, v); }
  if (M.web) { out.push('', '## Web'); for (const [k, v] of Object.entries(M.web)) line(k, v); }
  out.push('', '## Tags', JSON.stringify(M.custom_tags));
  out.push('', '## Sessions', ...Object.entries(M.per_session).sort((a, b) => b[1].calls - a[1].calls).map(([s, v]) => `  ${s} ${JSON.stringify(v)}`));
  if (M.ci) { out.push('', '## CI'); for (const [k, v] of Object.entries(M.ci)) line(k, v); }
  out.push('', '## Trend row', TREND_COLUMNS.join(','), trendRow(M));
  return out.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.calls && !args.ci) throw new Error('give --calls calls.json and/or --ci ci.json');
  const data = args.calls ? JSON.parse(fs.readFileSync(String(args.calls), 'utf8')) : { calls: [], humans: [], sessions: {}, counts: {}, window: null };
  const ci = args.ci ? JSON.parse(fs.readFileSync(String(args.ci), 'utf8')) : null;
  if (!data.window && ci) data.window = ci.window;
  const M = compute(data, ci);
  if (args.out) fs.writeFileSync(String(args.out), JSON.stringify(M, null, 1));
  console.log(summary(M));
  if (args['append-trend']) {
    appendTrend(String(args['append-trend']), trendRow(M));
    console.log(`\nAppended the row to ${args['append-trend']}`);
  }
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(e.message); process.exit(1); }
}

module.exports = { compute, trendRow, appendTrend, unionMin, shape, TREND_COLUMNS };
