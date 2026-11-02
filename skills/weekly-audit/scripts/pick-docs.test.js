// Run with: node --test skills/weekly-audit/scripts/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pickDocs, reReadLine, readRecords } = require('./pick-docs.js');

const commits = new Map([
  ['a.md', '2026-01-01T00:00:00Z'],
  ['b.md', '2026-06-01T00:00:00Z'],
  ['c.md', '2026-03-01T00:00:00Z'],
  ['d.md', '2026-10-01T00:00:00Z'],
]);

test('docs never re-read come first, oldest last commit first', () => {
  const got = pickDocs({ docs: ['b.md', 'a.md', 'c.md', 'd.md'], lastCommit: commits, count: 3 });
  assert.deepStrictEqual(got, ['a.md', 'c.md', 'b.md']);
});

test('then the docs re-read longest ago', () => {
  const reReads = new Map([['a.md', '2026-10-26'], ['c.md', '2026-10-19'], ['b.md', '2026-10-26']]);
  const got = pickDocs({ docs: ['a.md', 'b.md', 'c.md', 'd.md'], reReads, lastCommit: commits, count: 3 });
  assert.deepStrictEqual(got, ['d.md', 'c.md', 'a.md']);
});

test('a recent commit does not count as a re-read', () => {
  const lastCommit = new Map([...commits, ['a.md', '2026-11-01T00:00:00Z']]);
  const reReads = new Map([['b.md', '2026-10-26'], ['c.md', '2026-10-26'], ['d.md', '2026-10-26']]);
  assert.deepStrictEqual(pickDocs({ docs: ['a.md', 'b.md', 'c.md', 'd.md'], reReads, lastCommit, count: 1 }), ['a.md']);
});

test('docs the range changed are left out', () => {
  const got = pickDocs({ docs: ['a.md', 'b.md', 'c.md'], changed: ['a.md'], lastCommit: commits, count: 3 });
  assert.deepStrictEqual(got, ['c.md', 'b.md']);
});

test('the re-read line reads names, with or without backticks, and "none"', () => {
  assert.deepStrictEqual(reReadLine('# x\nDocs re-read: `docs/a.md`, b.md (clean)\n'), ['docs/a.md', 'b.md']);
  assert.deepStrictEqual(reReadLine('Docs re-read: none'), []);
  assert.deepStrictEqual(reReadLine('no line here'), []);
});

test('records give each doc its newest re-read date', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pick-docs-'));
  fs.writeFileSync(path.join(dir, '2026-10-19.md'), 'Docs re-read: a.md, b.md\n');
  fs.writeFileSync(path.join(dir, '2026-10-26.md'), 'Docs re-read: a.md\n');
  fs.writeFileSync(path.join(dir, 'notes.md'), 'Docs re-read: z.md\n');
  const got = readRecords(dir);
  assert.strictEqual(got.get('a.md'), '2026-10-26');
  assert.strictEqual(got.get('b.md'), '2026-10-19');
  assert.strictEqual(got.has('z.md'), false);
});
