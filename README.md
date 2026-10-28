# Skills

**Agent skills for product teams who build with Claude Code: the work between design and code that nobody has time
for.**

[![skills.sh](https://skills.sh/b/matthewzammit/skills)](https://skills.sh/matthewzammit/skills)

Each skill is a folder: a `SKILL.md` the agent follows step by step, and a `README.md` for you. They ask before they
act, check their own work, and come from real projects, with the mistakes already made for you. Built and tested with
Claude Code; they install into Cursor, Codex and [other agents](https://skills.sh) too.

## Install

```bash
npx skills add matthewzammit/skills
```

It asks which skills and agents to install. Add `-g` to install for every project. Or as a Claude Code plugin:

```
/plugin marketplace add matthewzammit/skills
/plugin install matthewzammit-skills@matthewzammit
```

## The skills

**Design**

- **[figma-from-code](skills/figma-from-code/)**: rebuild your mobile app or web app in Figma from its code: every
  screen and state in light and dark, responsive desktop, tablet and mobile views for the web, on a real design system.
- **[figma-sync](skills/figma-sync/)**: keep that Figma file updated with the code, for mobile and web, with a weekly
  drift check that asks before it changes anything.

**Engineering**

- **[ci-audit](skills/ci-audit/)**: CI, git hooks and AI agent time, in one audit you run any time or weekly:
  where your development loop lost time, ranked by minutes, with a trend and the fixes to build.

More skills are coming. Watch the repo to hear about them.

---

## Figma from code

<p align="center">
  <img src="assets/figma-from-code.png" alt="Figma from code: your app's code on the left, Claude Code in the middle, and on the right a Figma file with screens in light and dark, an empty state, and a design system of colours, buttons and components." width="100%">
</p>

**Your whole mobile or web app, rebuilt in Figma from its real code by Claude Code. Every screen, every state, light
and dark, responsive on the web, on a real design system. Then kept updated, every week, without anyone redrawing a
thing.**

**Build in code. Review in Figma.** Claude reads your code and builds the Figma file the way a careful designer
would: components, design system, brand guidelines, every screen variant. Then it checks the file against the code
every week, so Figma stays a true picture of what you shipped.

> We built this for the [Binderr](https://binderr.com) Wallet app. In two days Claude rebuilt it in Figma: **about 716
> screens** in light and dark, **144 components** (391 variants), **81 icons** and a **28-slide brand deck**. Much of it
> ran overnight. Every lesson from that build is in these skills.

### Why you need it

When AI builds the product with you, there is no point drawing every screen in Figma first. You sketch, then grow
the product in code with Claude, screen by screen. But Figma is still the best place to:

- **Review**: designers, product people and clients comment on the real product, side by side, in light and dark.
- **Keep a reference**: every screen, state and component in one place, for onboarding, audits and the next feature.
- **Make marketing assets**: app store screenshots, decks, launch posts and the website, from real screens, not mockups.

So run the loop the other way. Figma is where you start and where you review; code is where you build.

```
   Figma                     Code, with Claude              Figma
   a basic design system  -> grow the product,           -> every screen, state and component,
   and a few pages           screen by screen               rebuilt from the code, kept updated
```

This is how we work on the Binderr Wallet: we started in Figma with a basic design system and a few pages, grew the
app with Claude, then rebuilt Figma from the code with every new page and component.

### What you get

- **Every screen a person can reach**, with its loading, empty and error states, sheets and dialogs, laid out by area
  and flow, with notes on motion and what is not drawn.
- **Mobile apps and web apps.** For the web, responsive views too: desktop and mobile for every screen, and tablet
  where the layout changes, taken from your code's own breakpoints.
- **Light and dark as one frame**, switched by variable modes. Flip the whole page with one click.
- **A real design system**: your colours, sizes and type as Figma variables and styles, your icons, and every shared
  component with its variants. Change a component, and every screen updates.
- **Editable layers, not screenshots.** Every word comes from your code.
- **An optional brand deck** to present the design to your team.
- **A weekly drift check** that tells you what changed in the code since the last sync, plans the redraw, and asks
  before it touches anything.

Works for mobile apps (React Native, Swift, Kotlin, Flutter) and web apps (React, Next.js, Vue and more). We used it on
two Binderr products: the Wallet mobile app, and a web platform whose team started its Figma build from an earlier
version of the same process. The web steps in this exact form (responsive widths, hover and focus states, pre-captured
references) are newer, so expect some rough edges, and tell me what you find.

### How it works

```
  You: "Rebuild our app in Figma from the code"
        |
  1. Claude reads your repo, then asks what it cannot find out
        |      the Figma link, what to build, themes, fonts, who reviews
  2. It checks every access, and every font Figma can and cannot load
        |
  3. It maps every screen and state, and you approve the plan
        |
  4. Foundations, then a pilot of 2 or 3 screens: you review hard
        |
  5. Batches, one area at a time, each reviewed against the running app
        |
  6. figma-sync: a sync record, a diff, and a weekly drift check
```

**It asks before it builds.** Claude looks at your code first, says what it found ("an Expo app, 84 screens, light and
dark, one local font"), then asks only what is left: your Figma file, what to build first, which theme is the default,
which version of the app to show, your old designs, web widths, and who reviews.

**It catches the font problem early.** Claude's Figma tool cannot load a font that lives only on your computer (a
licensed brand font, say). The skill tests every font your code uses before it draws anything, and tells you exactly
what to set up: the font installed, the Claude in Chrome extension, and Figma open in that Chrome.

### Two skills

| Skill | Run it | What it does |
|---|---|---|
| [**figma-from-code**](skills/figma-from-code/) | Once | The first build: questions, checks, a map, a pilot, then batches you review. |
| [**figma-sync**](skills/figma-sync/) | After a change, each release, and weekly | Finds what changed since the last sync, checks the file's own rules, asks what to update, redraws it, records the sync. Works on any Figma file that mirrors your app, even one drawn by hand. |

Two, because they run at different times: you build once, but you keep it updated forever. You only start the first
one: at the end of the build it installs figma-sync, sets it up, and offers to schedule the weekly drift check.

### What you need

- Claude Code, with a strong model to plan and review (we used Opus) and a faster one for batches (Sonnet).
- Your repo, and the app running locally (simulator, emulator or browser), so Claude can compare its work.
- Figma edit access, and the Figma plugin for Claude Code (or the Figma connector), signed in.
- If a font in your app is not a Google font: the font on your computer, and Claude in Chrome.

Then, in your app's repo, say **"rebuild our app in Figma from the code"**. Read [the full guide](skills/figma-from-code/)
for the lessons that cost us hours, and the limits.

---

## CI audit

**Where did last week go? CI, your git hooks, and the time Claude Code spent waiting, retrying and checking its own
work, in one audit, ranked by minutes lost.**

> On the [Binderr](https://binderr.com) Wallet app, one week: CI cost 0 people-minutes and 60 runner-minutes. Claude's
> own checks on the simulator cost 190 minutes. The biggest problem was not in CI at all: another agent session
> cleared a shared build cache during a release, and the release took 44 minutes instead of 24. Nobody had measured
> any of it.

### Why you need it

Most CI audits read your workflow files and your last few runs. When agents write and test the code, most lost time
is outside CI: waits, retries, refused commands, slow checks on a simulator or in a browser, a hook that runs the
same tests twice. This skill reads Claude Code's transcripts on your machine, beside GitHub Actions and your hooks,
and ranks every problem in one list.

### What you get

- **Holes:** code that reached your main branch with no passing CI run, and for how long.
- **The gate:** hooks installed and matching CI, push times week on week, old hooks still running in old worktrees.
- **Agent time:** sleeps, retries, hook refusals, slow commands run again and again, each with its minutes.
- **Mobile and web add-ons:** simulator, emulator and browser checks, native builds, dev server starts.
- **A report, a trend row and numbered fixes**, each marked measured or estimated. It changes nothing until you pick;
  then it builds your picks on a branch and opens a pull request.

### Run it

| You type | When |
|---|---|
| `/ci-audit setup` | Once per repo: it looks first, then asks where records go and how you file tickets. |
| `/ci-audit` | Any time: last week, Monday to Monday. Or `/ci-audit last 7 days`, or two dates. |

It also starts when you ask "why is CI so slow?". To run it every Monday, schedule it in the Claude desktop app.

### What you need

- Claude Code, on the machine where you and Claude work (the transcripts live there).
- GitHub Actions, and `gh` signed in. GitLab CI and others are not covered yet. Reviewing code somewhere else (Linear
  Diffs, say) is fine: the pull requests and their runs stay on GitHub.
- Node 18 or newer. The scripts install nothing.

Read [the full guide](skills/ci-audit/) for what each check looks at.

---

## Contributing

Run reports and pull requests are welcome, above all from web apps. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE). Made by [Matthew Zammit](https://github.com/matthewzammit). If a skill helps, tell me what worked.
