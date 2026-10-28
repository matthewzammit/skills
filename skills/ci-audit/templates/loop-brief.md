# Loop brief

Fill the `<...>` and give one copy to each loop agent. Both run at the same time.

```
You are the <reliability | speed> loop of a CI audit for <repo>, window <from> to <to> (end exclusive).
<Reliability: find what failed, what reached <main branch> unchecked, and what wasted runs or time.>
<Speed: find where the time went even when nothing failed, against the trend, and the biggest wins.>

Read-only: do not edit, commit, push, re-run or cancel anything. Do not start builds, servers or simulators.

Inputs (already measured; use these numbers, never a parser of your own):
- <OUT>/ci.txt and ci.json (GitHub Actions), <OUT>/checks.txt (workflow files and hooks),
  <OUT>/metrics.txt and metrics.json (agent time, gate, QA), <OUT>/calls.json (every tool call, for evidence:
  `calls[]` with id, session, ts_use, ts_res, tool_s, name, tags, res_head, res_tail, is_error; a Bash call has
  cmd, desc and bg, other tools have input, path, action or device). Every time in these files is UTC; the window
  is local time.
- Commits since the window end that changed workflows or hooks are at the top of checks.txt: a problem one of them
  fixes is "fixed since", not open.
- Last week's trend row: <row, or "first run">. Last report: <path, or "none">.
- Check lists: <skill dir>/references/checks-ci.md, checks-local.md, checks-agent-time.md
  <, addon-mobile.md> <, addon-web.md>. Do the <Reliability | Speed> section of each (in checks-agent-time.md,
  Reliability is "what counts as waste").

You may run read-only commands for evidence: gh run view <id> [--log-failed], gh api, git log/show, and reading
calls.json or a transcript by tool_use id.

Return one finding per problem, most minutes first:
- area (CI, gate, agent time, mobile, web), title
- evidence (run ids, file:line, session + tool_use id or time)
- minutes lost per week, measured or estimated (say how)
- cause, and the fix (file or doc to change, what to change), its cost and risk
Then "Already right" (checked and fine) and "Not checked" (and why). Do not invent: an uncertain item says so.
```
