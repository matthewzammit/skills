---
name: dev-loop-audit
description: Development loop audit for a repo - CI, git hooks and AI agent time over a week (GitHub Actions failures, flakes, holes on the main branch, slow jobs and billed minutes; local hooks and the pre-push gate; Claude Code's own waits, retries and simulator or browser checks), ranks every problem by minutes lost, keeps a trend, and asks which fixes to build. Use when someone asks why CI or the agent is slow or flaky, wants a CI or pipeline audit, or wants a weekly audit scheduled.
argument-hint: "[setup | last week | last 7 days | YYYY-MM-DD YYYY-MM-DD]"
---

# Dev loop audit

Measure where the development loop lost time last week, rank every problem by **minutes lost**, prove the top
ones, and ask which fixes to build. Three areas, one ranking: **CI** (GitHub Actions), the **gate** (git hooks and
the checks people run before a push), and **agent time** (what Claude Code spent waiting, retrying and checking its
work on a simulator or in a browser). Agent time is often the biggest cost and the one nobody measures.

Talk to the person in short, plain sentences, with a recommendation. Every number comes from a script or a
command; an estimate says "estimated". **Read-only until the person picks fixes**: the only files you write before
that are the record and the trend row.

Scripts (Node 18+, no installs) are in `${CLAUDE_SKILL_DIR}/scripts/`. Run them from the repo root. Put their
output in a scratch folder (`$OUT` below), never in the repo.

## 1. Setup (first run only)

If the repo has no dev-loop-audit config (`.dev-loop-audit/config.json`, or `~/.claude/dev-loop-audit/<repo>/config.json`), or
`$ARGUMENTS` is `setup`, follow [references/setup.md](references/setup.md), then stop if the argument was `setup`.

Done when: a config exists and says where records go, which workflows are CI, the add-ons, and how tickets are filed.

## 2. Window

From `$ARGUMENTS`: empty or "last week" is last Monday to this Monday (local time); "last 7 days" is `--days 7`;
two dates are `--from A --to B` (`--to` is the day after the last day). Run `date` first; never guess today.
Read the record folder's `trend.csv` and the last report, so you know last week's numbers and past fixes.

Done when: you can say the window in one line, and you have last week's row (or know this is the first run).

## 3. Measure

```bash
node ${CLAUDE_SKILL_DIR}/scripts/ci-runs.js <window> --out $OUT/ci.json > $OUT/ci.txt
node ${CLAUDE_SKILL_DIR}/scripts/repo-checks.js <window> --out $OUT/checks.json > $OUT/checks.txt
node ${CLAUDE_SKILL_DIR}/scripts/transcripts.js <window> --out $OUT/calls.json
node ${CLAUDE_SKILL_DIR}/scripts/metrics.js --calls $OUT/calls.json --ci $OUT/ci.json --out $OUT/metrics.json > $OUT/metrics.txt
```

`<window>` is the same options for each, one per argument (in zsh, an unquoted `$VAR` does not split: use an
array). `ci-runs.js` needs `gh` signed in; it checks the API rate limit first and says so if it is low.
`repo-checks.js` reads the files as they are now and lists the commits since the window end that changed workflows
or hooks: a finding one of them fixes is reported as "fixed since", not as open. If a script
misses a command shape this repo uses (its own helper scripts), add a tag to the config's `tags` and run again;
never write a second parser. Cross-check the busiest session: `transcripts.js <window> --check <session>`
counts its calls with a plain reader; the number equals its `calls` under Sessions in `metrics.txt`. (A grep of
the whole transcript counts other weeks, replays and subagents, so it is always higher.)

Agent time reads Claude Code transcripts only. When `transcripts.js` says "No transcript folders matched" (another
agent, or another machine), its zeros are not measurements: report agent time under "not checked", say why, and
audit CI and the gate as usual.

Done when: all four outputs exist, and the cross-check holds or you know why it differs.

## 4. Two loops, in parallel

Launch two agents at once (the Agent tool), each with [templates/loop-brief.md](templates/loop-brief.md) filled in:

- **Reliability**: what failed, what reached the main branch unchecked, what wasted runs or time.
- **Speed**: where the time went even when nothing failed, against the trend, and the biggest wins.

They read the outputs from step 3 and the check lists: [references/checks-ci.md](references/checks-ci.md),
[references/checks-local.md](references/checks-local.md), [references/checks-agent-time.md](references/checks-agent-time.md),
plus [references/addon-mobile.md](references/addon-mobile.md) and [references/addon-web.md](references/addon-web.md)
when the config turns those on. Each returns findings with evidence ids and minutes.

Done when: both loops have returned, and every item in the check lists that applies has a result (a finding,
"already right", or "not checked" with why).

## 5. Verify the top 5

For the five findings with the most minutes, across both loops, re-check the raw evidence yourself: open the run
(`gh run view <id> --log-failed`), re-count in `calls.json`, read the transcript lines by tool_use id. Try to prove
each one wrong. Drop or downgrade what does not hold, and say so in the report.

Done when: each of the five is "holds", "downgraded" (with the new number) or "dropped" (with why).

## 6. Record

1. Write the report from [templates/report.md](templates/report.md) to `<records>/<YYYY-MM-DD>.md` (the run's date),
   following [references/report.md](references/report.md).
2. Append the trend row: `node ${CLAUDE_SKILL_DIR}/scripts/metrics.js --calls $OUT/calls.json --ci $OUT/ci.json --append-trend <records>/trend.csv`.
3. If the config files tickets: follow its `tickets.how` exactly (its naming, its commands, which fixes get a ticket).
   Where it is silent: one parent named "Dev loop audit, YYYY-MM-DD" and one ticket per proposed fix under it.
   Never reuse an earlier run's parent.

Done when: the report and the row exist, and tickets are filed if the config asks for them.

## 7. Report and ask

Reply in the chat, short:

- Minutes lost per area (CI, gate, agent time), one line each, with the change from last week.
- What broke, most minutes first. What got slower or faster, most minutes first. What is already right.
- The proposed fixes, numbered, ranked by minutes saved a week, each marked Reliability or Speed and its area,
  with your pick.

Then ask: "Which should I build? Numbers, 'all' or 'none'." **Stop and wait.**

Done when: the person has the list and the question.

## If the person picks fixes

Build only those, on a new branch (`fix/dev-loop-audit-<date>`) from the main branch, one commit per fix, with the
repo's own checks green. A rule for agents (not code) goes in the repo's agent docs (`AGENTS.md`, `CLAUDE.md`).
A fix bigger than a day becomes a written plan instead of code. Open a pull request with the findings and what each
fix should change in next week's numbers. Never merge it. Add a line per fix to the report's "Built" section.
