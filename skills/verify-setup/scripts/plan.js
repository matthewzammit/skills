#!/usr/bin/env node
/**
 * Print the checks for the current change, cheapest first, and the stamp line to put on the commit.
 *
 *   node .verify/plan.js            text
 *   node .verify/plan.js --json     the same as JSON
 *
 * Reads `git diff --name-only HEAD` plus untracked files, and the repo's verify config: a list of checks in
 * order, each with `paths` (globs), a `token`, and either a `command` or `manual: true` (a step the
 * agent does by looking, such as running the app and reading the changed screen). A check with paths ["**"] runs for every change.
 */
const { matchesAny, isDocsOnly, loadConfig, git, parseArgs } = require('./verify-lib.js');

/** Pure: which checks apply to these files, in config order, and the suggested stamp. */
function planChecks(files, config) {
  if (files.length === 0) return { files, checks: [], stamp: 'Verified: none (no changes)' };
  if (isDocsOnly(files, config.skipPaths)) return { files, checks: [], stamp: 'Verified: none (docs only)' };
  const checks = (config.checks || []).filter((c) => (c.paths || ['**']).some((p) => files.some((f) => matchesAny(f, [p]))));
  const tokens = [...new Set(checks.map((c) => c.token))];
  return { files, checks, stamp: tokens.length ? `Verified: ${tokens.join(', ')}` : 'Verified: none (no check covers these files)' };
}

function formatPlan(plan, config) {
  const out = [`Changed files: ${plan.files.length}`];
  plan.checks.forEach((c, i) => {
    // A manual check is one the agent does by looking (run the app, read the screen), not a command. It is never a
    // job for the person.
    const how = c.manual ? `agent looks: ${c.description || c.token}` : c.command;
    const marks = !c.manual && c.command.includes('mark-pass.js');
    const proof = config.provenTokens.includes(c.token) && !marks ? ` (then: node .verify/mark-pass.js ${c.token})` : '';
    out.push(`${i + 1}. [${c.token}] ${how}${proof}`);
  });
  if (!plan.checks.length) out.push('No checks to run.');
  out.push('', 'Stamp, if every check above passes (list only the tokens that ran):', plan.stamp);
  return out.join('\n');
}

function changedFiles(cwd) {
  const lines = [];
  try { lines.push(...git(['diff', '--name-only', 'HEAD'], cwd).split('\n')); }
  catch { lines.push(...git(['diff', '--name-only', '--cached'], cwd).split('\n')); }
  lines.push(...git(['ls-files', '--others', '--exclude-standard'], cwd).split('\n'));
  return [...new Set(lines.map((l) => l.trim()).filter(Boolean))];
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = git(['rev-parse', '--show-toplevel'], process.cwd());
  const { config } = loadConfig(root);
  const plan = planChecks(changedFiles(root), config);
  console.log(args.json ? JSON.stringify(plan, null, 2) : formatPlan(plan, config));
}

if (require.main === module) main();
module.exports = { planChecks, formatPlan };
