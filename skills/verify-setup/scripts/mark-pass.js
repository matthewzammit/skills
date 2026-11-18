#!/usr/bin/env node
/**
 * Record that the full check passed for this HEAD. Run it as the last step of the full check, only on success:
 *
 *   npm run validate && node .verify/mark-pass.js
 *
 * Writes `verify-marker.json` in the git common dir (shared by worktrees, never committed): one entry per token
 * with the head sha and the time. The commit-msg stamp check trusts a proven token only with a fresh marker.
 */
const fs = require('node:fs');
const path = require('node:path');
const { loadConfig, git, gitCommonDir } = require('./verify-lib.js');

/** Pure: add one entry to a marker file's content. */
function withMarker(existing, token, sha, now) {
  const out = existing && typeof existing === 'object' ? { ...existing } : {};
  out[token] = { sha, time: new Date(now).toISOString() };
  return out;
}

function main() {
  const root = git(['rev-parse', '--show-toplevel'], process.cwd());
  const { config } = loadConfig(root);
  const token = process.argv[2] || config.fullToken;
  const file = path.join(gitCommonDir(root), 'verify-marker.json');
  let existing = {};
  try { existing = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* first marker */ }
  fs.writeFileSync(file, JSON.stringify(withMarker(existing, token, git(['rev-parse', 'HEAD'], root), Date.now()), null, 2));
  console.log(`verify: marked "${token}" as passed for ${git(['rev-parse', '--short', 'HEAD'], root)}`);
}

if (require.main === module) main();
module.exports = { withMarker };
