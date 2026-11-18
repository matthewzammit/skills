const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { evaluate, decide, logLine } = require('./stamp-check.js');
const { mergeConfig } = require('./verify-lib.js');

const config = mergeConfig({});
const now = Date.parse('2026-11-18T12:00:00Z');
const marker = { full: { sha: 'abc', time: '2026-11-18T11:50:00Z' } };
const agent = (stamp) => `Change\n\n${stamp ? `${stamp}\n` : ''}Co-Authored-By: Claude Opus <noreply@anthropic.com>`;
const ev = (over) => evaluate({ message: agent('Verified: lint'), files: ['src/a.js'], isMerge: false, config, markers: marker, headSha: 'abc', now, ...over });

test('an agent commit with a stamp is ok', () => assert.strictEqual(ev({}).status, 'ok'));
test('an agent commit without a stamp is unstamped', () => assert.strictEqual(ev({ message: agent('') }).status, 'unstamped'));
test('none with a reason is counted as none', () => {
  const r = ev({ message: agent('Verified: none (config only)') });
  assert.strictEqual(r.status, 'none');
  assert.strictEqual(r.note, 'config only');
});
test('merges, docs-only and human commits are skipped', () => {
  assert.strictEqual(ev({ isMerge: true }).status, 'skipped');
  assert.strictEqual(ev({ files: ['README.md'], message: agent('') }).status, 'skipped');
  assert.strictEqual(ev({ message: 'Fix\n\nCo-Authored-By: Pat <p@x.com>' }).status, 'skipped');
});
test('the full token needs a fresh marker for this HEAD', () => {
  assert.strictEqual(ev({ message: agent('Verified: lint, full') }).status, 'ok');
  assert.strictEqual(ev({ message: agent('Verified: lint, full'), headSha: 'zzz' }).status, 'unproven');
  const old = { full: { sha: 'abc', time: '2026-11-18T08:00:00Z' } };
  const r = ev({ message: agent('Verified: full'), markers: old });
  assert.strictEqual(r.status, 'unproven');
  assert.deepStrictEqual(r.unproven, ['full']);
});
test('a stamp in the body, not the last paragraph, does not count', () => {
  assert.strictEqual(ev({ message: 'Change\n\nVerified: lint\n\nmore\nCo-Authored-By: Claude <a@b>' }).status, 'unstamped');
});

test('observe never blocks', () => {
  assert.strictEqual(decide({ status: 'unstamped', mode: 'observe', state: {}, session: 's', now, sessionMinutes: 120 }).action, 'pass');
});
test('enforce blocks twice, then releases, then blocks again', () => {
  let state = {};
  const step = () => { const d = decide({ status: 'unstamped', mode: 'enforce', state, session: 's', now, sessionMinutes: 120 }); state = d.state; return d.action; };
  assert.deepStrictEqual([step(), step(), step(), step()], ['block', 'block', 'released', 'block']);
});
test('enforce passes good commits and other sessions count separately', () => {
  assert.strictEqual(decide({ status: 'ok', mode: 'enforce', state: {}, session: 's', now, sessionMinutes: 120 }).action, 'pass');
  const state = { a: { count: 2, at: new Date(now).toISOString() } };
  assert.strictEqual(decide({ status: 'unstamped', mode: 'enforce', state, session: 'b', now, sessionMinutes: 120 }).action, 'block');
});
test('old block counts reset', () => {
  const state = { s: { count: 2, at: '2026-11-18T01:00:00Z' } };
  assert.strictEqual(decide({ status: 'unstamped', mode: 'enforce', state, session: 's', now, sessionMinutes: 120 }).action, 'block');
});

test('logLine is one tab-separated line with no stray tabs', () => {
  const line = logLine({ now, sha: 'abc', status: 'none', mode: 'observe', action: 'pass', tokens: [], unproven: [], session: 's', note: 'a\tb\nc' });
  assert.strictEqual(line.split('\t').length, 9);
  assert.ok(!line.includes('\n'));
});

test('the hook end to end in a temp repo: observe logs, enforce blocks, a crash exits 0', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-'));
  const run = (args, env = {}) => spawnSync(args[0], args.slice(1), { cwd: dir, encoding: 'utf8', env: { ...process.env, ...env, VERIFY_CONFIG: '', HOME: dir } });
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 't@t'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 't'], { cwd: dir });
  fs.writeFileSync(path.join(dir, 'a.js'), 'x');
  execFileSync('git', ['add', '.'], { cwd: dir });
  const msg = path.join(dir, 'MSG');
  fs.writeFileSync(msg, agent(''));
  const script = path.join(__dirname, 'stamp-check.js');
  const observe = run(['node', script, msg]);
  assert.strictEqual(observe.status, 0);
  const log = path.join(dir, '.git', 'verify-log.tsv');
  assert.match(fs.readFileSync(log, 'utf8'), /\tunstamped\tobserve\tpass\t/);
  const enforce = run(['node', script, msg], { VERIFY_MODE: 'enforce', VERIFY_SESSION: 't1' });
  assert.strictEqual(enforce.status, 1);
  assert.match(enforce.stderr, /no Verified: line/);
  assert.strictEqual(run(['node', script, path.join(dir, 'missing')], { VERIFY_MODE: 'enforce' }).status, 0);
  fs.rmSync(dir, { recursive: true, force: true });
});
