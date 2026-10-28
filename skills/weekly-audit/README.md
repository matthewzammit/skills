<p align="center">
  <img src="../../assets/weekly-audit.png" alt="Weekly audit: last week's commits and your installed review skills on the left, your agent in the middle, and on the right one verified list of findings with severity, a decision with options, and what carried over." width="100%">
</p>

# Weekly audit

**Reviews last week's code changes with the review skills you install, and gives you one checked list.**

Good review skills already exist: for security, accessibility, design, React and React Native, and writing. What
is missing is the routine around them: which code to look at, a record of each run, tickets that do not get lost,
and someone checking that each finding is real. This skill is that routine.

## Install

```bash
npx skills add matthewzammit/skills --skill weekly-audit
```

It works in Claude Code, Cursor, Codex and other agents. It asks where to install: this project only, or global
(every project on your computer). Run it again to update.

Or as a Claude Code plugin, which installs all the skills in this repo:

```
/plugin marketplace add matthewzammit/skills
/plugin install matthewzammit-skills@matthewzammit
```

## Then install the review skills

This skill runs other people's review skills, so it is only as good as the ones you install. Setup tells you which
fit your repo. The starter set:

| Skill | What it checks | For |
|---|---|---|
| `vibe-security` | Secrets, access control, auth, deep links, payments | Any |
| `web-design-guidelines` | Accessibility, focus, forms, motion, touch | Web, and the accessibility parts on mobile |
| `vercel-react-native-skills` | React Native and Expo performance and patterns | Mobile |
| `better-ui` | Hit areas, radius, press feedback, polish | Any |
| `better-typography` | Type scale, line height, numbers, truncation | Any |
| `better-colors` | Contrast and palettes | Any |
| `no-ai-slop` | Wording that sounds machine-written | Any |

Authors, install commands and two we dropped (and why) are in
[references/review-skills.md](references/review-skills.md).

## Run it

| You type | When | What happens |
|---|---|---|
| `/weekly-audit setup` | Once per repo | Picks the review skills that fit, asks where records go, how you file tickets, and whether fixes are on. |
| `/weekly-audit` | Every Monday, or any time | Reviews everything since the last run (the first time, the last 7 days). |

When installed as a Claude Code plugin, the command is `/matthewzammit-skills:weekly-audit`.

## What a run does

1. **Scope:** only the commits since the last run. A week with no commits ends in one line.
2. **Review:** one agent per review skill, all at once, on the changed files. A few checks always run, because no
   skill covers them: new routes or endpoints that need an access check, docs for the features that changed, and
   errors that never reach crash reporting.
3. **Check:** it removes duplicates and tries to prove each finding wrong against the code. What does not hold is
   dropped, and the record says why.
4. **Decide:** a finding that needs your choice comes with 2 or 3 options and a pick.
5. **Record and tickets:** a dated record in your repo. If you use a tracker, one ticket per finding under a new
   group for the week, and last week's open tickets move into it.
6. **Fixes, only if you turn them on:** a draft pull request for each finding with one clear fix. It never merges.
7. **Summary:** progress first, then what needs your decision.

## Why fixes are off by default

We ran an unattended audit that wrote its own fixes. It shipped six regressions, and every one passed lint, types,
tests, CI and a device check. Most findings worth having need a person's judgement anyway. So the audit reports by
default; when you turn fixes on, each one is a draft that a person reviews, and a `.weekly-audit-off` file stops
them at any time.

## The weekly run

Schedule it every Monday in the Claude desktop app (Code tab, Scheduled, "Only on this computer"). The prompt and
the steps are in [templates/weekly-routine.md](templates/weekly-routine.md).

## Credits

The review rules belong to the authors of each review skill (listed in
[references/review-skills.md](references/review-skills.md)). The routine comes from the weekly audit we ran on the
[Binderr](https://binderr.com) Wallet app.
