<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/banner-dark.png">
  <img src="assets/banner-light.png" alt="matthewzammit/skills: skills for product teams building with AI agents. figma-from-code, figma-sync, dev-loop-audit, qol-pass, weekly-audit, weekly-progress-note." width="100%">
</picture>

# Skills for product teams building with AI agents

[![skills.sh](https://skills.sh/b/matthewzammit/skills)](https://skills.sh/matthewzammit/skills)

Agent skills for the jobs around the code that never make it to the top of the list: keeping Figma in line with
what you actually shipped, finding the small problems users notice, and working out where the week went. Each one came out of shipping a real app with AI
agents, so the mistakes are already made for you.

Each skill is a folder: a `SKILL.md` your agent follows step by step, and a `README.md` for you. They ask before they
change anything, check their own work, and tell you what they measured and what they guessed. They work in Claude
Code, Cursor, Codex and [other agents](https://skills.sh).

## Skills

**Design**

<table>
<tr><th width="200" align="left">Skill</th><th align="left">What it does</th><th width="200" align="left">When you run it</th></tr>
<tr><td><a href="skills/figma-from-code/">figma-from-code</a></td><td>Rebuilds your mobile or web app in Figma from its code: every screen and state in light and dark, responsive web views, a real design system.</td><td>Once, for the first build</td></tr>
<tr><td><a href="skills/figma-sync/">figma-sync</a></td><td>Keeps that Figma file in step with the code: finds what changed, asks, redraws, records the sync. Works on any Figma file that mirrors your app.</td><td>After a change, each release, weekly</td></tr>
</table>

**Product**

<table>
<tr><th width="200" align="left">Skill</th><th align="left">What it does</th><th width="200" align="left">When you run it</th></tr>
<tr><td><a href="skills/qol-pass/">qol-pass</a></td><td>A Quality of Life (QoL) pass: checks one section of your running app for the small problems users notice: dead ends, stale data, wording, empty and error states, layout at the largest text size, accessibility. Judges it against your QUALITY.md (and writes one if you have none).</td><td>Any time, one section per pass</td></tr>
<tr><td><a href="skills/weekly-progress-note/">weekly-progress-note</a></td><td>Drafts a short weekly note in plain words for the team: what shipped last week and a suggested plan for this week, checked against last week's plan. For last week, the last 7 days or any dates. Never posts.</td><td>Every Monday, or any time</td></tr>
</table>

**Engineering**

<table>
<tr><th width="200" align="left">Skill</th><th align="left">What it does</th><th width="200" align="left">When you run it</th></tr>
<tr><td><a href="skills/dev-loop-audit/">dev-loop-audit</a></td><td>Audits CI, your local checks and your agent's time together: where the week went, ranked by minutes, with a trend and the fixes to build.</td><td>Any time, or weekly</td></tr>
<tr><td><a href="skills/weekly-audit/">weekly-audit</a></td><td>Reviews the code that changed since the last run with the review skills you install (security, accessibility, design, writing), checks each finding against the code, and keeps one record and ticket list a week. Recommends which review skills to install.</td><td>Every Monday, or any time</td></tr>
</table>

More are on the way. Watch the repo to hear when they land.

## Install (30 seconds)

**Any agent** (Claude Code, Cursor, Codex and more):

```bash
npx skills add matthewzammit/skills
```

It asks which skills you want, which agents, and where: this project only, or global (every project on your
computer).

**Updates:** run the same command again.

**Or as a Claude Code plugin:**

```
/plugin marketplace add matthewzammit/skills
/plugin install matthewzammit-skills@matthewzammit
```

**Updates:** run `/plugin marketplace update matthewzammit`, or turn on auto-update for this marketplace in `/plugin`,
under Marketplaces.

Pick one way per agent, or you get every skill twice. That's it: each skill asks for what it needs the first time you
run it.

## Why these skills exist

### #1: Figma falls behind the code

<p align="center">
  <img src="assets/figma-from-code.png" alt="Figma from code: your app's code on the left, Claude Code in the middle, and on the right a Figma file with screens in light and dark, an empty state, and a design system of colours, buttons and components." width="100%">
</p>

**The problem.** When AI builds the product with you, nobody draws every screen in Figma first. You grow the product
in code, screen by screen. A few weeks in, Figma no longer shows what you shipped, and nobody has time to redraw it.
But Figma is still where your team reviews, keeps a reference, and makes marketing assets.

**The fix.** [**figma-from-code**](skills/figma-from-code/) rebuilds your mobile or web app in Figma from its real code:
every screen and state in light and dark, responsive views for the web, on a design system of real components and
variables. [**figma-sync**](skills/figma-sync/) then keeps it up to date after each change, with a weekly drift check
that asks before it redraws anything.

> On the [Binderr](https://binderr.com) Wallet app, Claude rebuilt about **716 screens**, **144 components** and a
> **28-slide brand deck** in two days, much of it overnight.

[Read more about Figma from code](skills/figma-from-code/)

<br>

### #2: Nobody knows where the week went

<p align="center">
  <img src="assets/dev-loop-audit.png" alt="Dev loop audit: GitHub Actions, git hooks and Claude Code transcripts on the left, Claude Code in the middle, and on the right minutes lost per area (agent time, gate, CI) and fixes ranked by minutes saved." width="100%">
</p>

**The problem.** A slow week rarely has one cause. Some of it is CI: a flaky test, a slow job, code that landed on
main without a passing run. Some of it is local: hooks that are not installed, or a check before each push that runs
every test twice. And when agents write and test the code, some of it is the agent: waiting, retrying, or running
the same simulator check again and again. Most audits look at one of these at most.

**The fix.** [**dev-loop-audit**](skills/dev-loop-audit/) checks all three:

- **CI:** your GitHub Actions runs. Failures, flaky tests, slow jobs, billed minutes, and code on main with no
  passing run.
- **Local checks:** your git hooks and the tests that run before a push. Installed? The same checks as CI? How long
  does a push take?
- **Agent time:** waits, retries, blocked commands, and checks in a simulator or browser, from your agent's own
  transcripts (Claude Code only for now).

It ranks every problem by minutes lost, double-checks the biggest ones, keeps a trend week to week, and asks which
fixes to build. Run it any time, or every Monday.

[Read more about the dev loop audit](skills/dev-loop-audit/)

<br>

### #3: Small problems reach your users

<p align="center">
  <img src="assets/qol-pass.png" alt="Quality of Life (QoL) pass: a QUALITY.md on the left, your agent in the middle, and on the right a numbered list of findings for one section, each with its area and a fix, and the question which to build." width="100%">
</p>

**The problem.** Code review catches bugs. It rarely catches the small problems users notice: a blank screen after you
delete the last item, a button that just says "OK", a count that is one behind, a label cut off at the largest
text size. And most teams have no written quality bar, so every review is one person's taste.

**The fix.** [**qol-pass**](skills/qol-pass/), a Quality of Life (QoL) pass, walks one section of your running app (a simulator or a browser) and
checks eight areas: behaviour, dead ends, wrong or stale data, wording, empty, loading and error states, layout
edge cases, motion, and accessibility. It judges what it finds against your own standards, or drafts a
`QUALITY.md` from what your code already does when you have none. You get one numbered list with a fix for each,
and it builds only what you pick, with before and after shots.

[Read more about the Quality of Life pass](skills/qol-pass/)

<br>

### #4: Nobody reviews last week's code

<p align="center">
  <img src="assets/weekly-audit.png" alt="Weekly audit: last week's commits and your installed review skills on the left, your agent in the middle, and on the right one checked list of findings with severity, a decision with options, and what carried over." width="100%">
</p>

**The problem.** When agents write a lot of the code, a week brings more changes than anyone reads closely. Good
review skills exist for security, accessibility, design and writing, but someone has to run them, check what they
say, and keep track. Without a routine, findings get lost or never get looked for.

**The fix.** [**weekly-audit**](skills/weekly-audit/) runs the review skills you install on everything that changed
since the last run, all at once. It removes duplicates, checks each finding against the code, writes a dated
record, and carries last week's open tickets over. A finding that needs your choice comes with options and a pick.
If you turn fixes on, it opens a draft pull request for each simple one. It tells you which review skills to
install for your stack.

[Read more about the weekly audit](skills/weekly-audit/)

<br>

### #5: Nobody has time to write the weekly update

<p align="center">
  <img src="assets/weekly-progress-note.png" alt="Weekly progress note: merged pull requests, releases and the changelog on the left, your agent in the middle, and on the right a short draft note with what shipped last week and a suggested plan for this week." width="100%">
</p>

**The problem.** A founder, a PM or a client wants to know what happened this week. The changelog has every
change, but nobody reads it, and writing the short version takes time nobody has. So the update is late, too
technical, or never sent.

**The fix.** [**weekly-progress-note**](skills/weekly-progress-note/) reads what was merged and released, checks
last week's plan, and drafts a short note in plain words: 5 to 8 lines on what shipped and a suggested plan for
this week. Every line comes from something merged or released. It never posts: you edit it and send it yourself.
Run it any time, for any dates, or every Monday.

[Read more about the weekly progress note](skills/weekly-progress-note/)

## Contributing

Run reports and pull requests are welcome, above all from web apps. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE). Made by [Matthew Zammit](https://github.com/matthewzammit). If a skill helps, open an issue and say
what worked.
