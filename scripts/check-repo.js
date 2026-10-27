// Repo checks for CI: the plugin files parse and agree, every skill has a valid name and description,
// and no file uses an em or en dash (house style).
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const errors = [];
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const plugin = JSON.parse(read('.claude-plugin/plugin.json'));
const market = JSON.parse(read('.claude-plugin/marketplace.json'));
if (!market.plugins?.some((p) => p.name === plugin.name)) {
  errors.push(`marketplace.json lists no plugin named "${plugin.name}" (plugin.json)`);
}

for (const dir of fs.readdirSync(path.join(root, 'skills'))) {
  const file = `skills/${dir}/SKILL.md`;
  if (!fs.existsSync(path.join(root, file))) { errors.push(`${file} is missing`); continue; }
  const front = read(file).match(/^---\n([\s\S]*?)\n---/);
  const name = front?.[1].match(/^name:\s*(.+)$/m)?.[1].trim();
  const desc = front?.[1].match(/^description:\s*(.+)$/m)?.[1].trim();
  if (name !== dir) errors.push(`${file}: name "${name}" must match its folder "${dir}"`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name ?? '')) errors.push(`${file}: name must be lowercase with hyphens`);
  if (!desc) errors.push(`${file}: description is missing`);
  if (!fs.existsSync(path.join(root, `skills/${dir}/README.md`))) errors.push(`skills/${dir}/README.md is missing`);
}

const walk = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  if (e.name === '.git' || e.name === 'node_modules') return [];
  return e.isDirectory() ? walk(p) : [p];
});
for (const file of walk('.')) {
  if (!/\.(md|js|json|ya?ml|svg)$/.test(file)) continue;
  if (/[\u2013\u2014]/.test(read(file))) errors.push(`${file}: uses an em or en dash`);
}

if (errors.length) {
  console.error(errors.map((e) => `- ${e}`).join('\n'));
  process.exit(1);
}
console.log('check-repo: plugin files, skill front matter and house style are fine.');
