// Run with: node --test skills/weekly-audit/scripts/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const { slug, anchors, links, pathRefs, scriptRefs, checkDoc } = require('./doc-facts.js');

test('slugs follow GitHub rules, repeats are numbered', () => {
  assert.strictEqual(slug('Hello, World! `x`'), 'hello-world-x');
  assert.strictEqual(slug('A_b - c'), 'a_b---c');
  const got = anchors('# Setup\n## Setup\n```\n# not a heading\n```\n<a name="old"></a>\n');
  assert.deepStrictEqual([...got].sort(), ['old', 'setup', 'setup-1']);
});

test('links skip fences, inline code, URLs and history lines', () => {
  const text = '[a](docs/a.md#x)\n`[b](b.md)`\n[c](https://x.io)\n```\n[d](d.md)\n```\n[e](e.md) was removed\n[f](#top)';
  assert.deepStrictEqual(links(text).map((l) => [l.target, l.anchor]), [['docs/a.md', 'x'], ['', 'top']]);
});

test('paths need a slash and a tracked top-level folder; fences and globs are skipped', () => {
  const text = '`src/a.ts` `README.md` `other/x.ts` `src/*.ts` `src/b.ts:12`\n```\n`src/c.ts`\n```\nsrc/d.ts was renamed `src/e.ts`';
  assert.deepStrictEqual(pathRefs(text, ['src']).map((r) => r.value), ['src/a.ts', 'src/b.ts']);
});

test('script refs are read in fences, families and builtins are skipped', () => {
  const text = '```\nnpm run build\npnpm run sim:*\nyarn install\nyarn lint\n```\nuse `npm run ci:check`. npm run <name>';
  assert.deepStrictEqual(scriptRefs(text).map((r) => r.name), ['build', 'lint', 'ci:check']);
});

test('checkDoc reports missing files, anchors, paths and scripts', () => {
  const files = { 'docs/a.md': '# Top\n[x](b.md#nope) [y](missing.md) [z](#top) [w](#gone)\n`src/gone.ts` `src/here.ts`\nnpm run nope, npm run ok\n', 'docs/b.md': '# Real\n', 'src/here.ts': '' };
  const got = checkDoc({
    file: 'docs/a.md',
    text: files['docs/a.md'],
    exists: (p) => p in files,
    readDoc: (p) => files[p] ?? null,
    roots: ['src', 'docs'],
    scripts: new Set(['ok']),
  });
  assert.deepStrictEqual(got.map((p) => p.what), [
    'anchor #nope matches no heading in docs/b.md',
    'link target missing.md does not exist',
    'anchor #gone matches no heading here',
    'path `src/gone.ts` does not exist',
    'package.json has no script "nope"',
  ]);
});

test('no package.json means no script checks; doc-check-ignore skips a line', () => {
  const got = checkDoc({ file: 'a.md', text: 'npm run x\n`src/y.ts` doc-check-ignore', exists: () => false, readDoc: () => null, roots: ['src'], scripts: null });
  assert.deepStrictEqual(got, []);
});
