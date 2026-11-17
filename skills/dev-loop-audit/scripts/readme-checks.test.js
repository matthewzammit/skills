// The README's "Every check" list must name every check the audit follows in references/, so a new check is
// never added without telling the reader. A check is a numbered bold title in a checks-*.md or addon-*.md file.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const DIR = path.join(__dirname, '..');
const REFS = path.join(DIR, 'references');

function checkTitles() {
  const titles = [];
  for (const file of fs.readdirSync(REFS).filter((f) => /^(checks|addon)-.*\.md$/.test(f))) {
    const text = fs.readFileSync(path.join(REFS, file), 'utf8');
    for (const m of text.matchAll(/^\s*\d+\. \*\*([^*]+)\*\*/gm)) {
      titles.push({ file, title: m[1].trim().replace(/:$/, '') });
    }
  }
  return titles;
}

test('references list the checks', () => {
  assert.ok(checkTitles().length > 40);
});

test('the README names every check in references/', () => {
  const readme = fs.readFileSync(path.join(DIR, 'README.md'), 'utf8');
  const missing = checkTitles().filter(({ title }) => !readme.includes(`**${title}**`));
  assert.deepStrictEqual(
    missing.map(({ file, title }) => `${file}: ${title}`),
    [],
    'add each check to the "Every check" section of README.md, as **<title>**',
  );
});
