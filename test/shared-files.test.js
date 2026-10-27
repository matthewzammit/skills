// figma-sync is installable on its own, so it carries copies of a few figma-from-code files.
// This keeps the copies identical: edit one, copy it to the other.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'skills');
const COPIES = ['references/build-rules.md', 'templates/batch-brief.md'];

for (const file of COPIES) {
  test(`figma-sync/${file} matches figma-from-code/${file}`, () => {
    const a = fs.readFileSync(path.join(root, 'figma-from-code', file), 'utf8');
    const b = fs.readFileSync(path.join(root, 'figma-sync', file), 'utf8');
    assert.strictEqual(b, a);
  });
}
