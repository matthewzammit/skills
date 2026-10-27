<p align="center">
  <img src="assets/figma-from-code.png" alt="Figma from code: your app's code on the left, Claude Code in the middle, and on the right a Figma file with screens in light and dark, an empty state, and a design system of colours, buttons and components." width="100%">
</p>

# Figma from code

**Your whole app, rebuilt in Figma from its real code by Claude Code. Every screen, every state, light and dark, on a
real design system. Then kept in step, every week, without anyone redrawing a thing.**

Most teams' Figma files stopped matching the product months ago. Designers review screenshots, developers guess which
frame is current, and nobody has a week to redraw 700 screens. These two skills fix that: Claude reads your code and
builds the Figma file the way a careful designer would, then checks it against the code every week.

> We built this for the [Binderr](https://binderr.com) Wallet app. In two days Claude rebuilt it in Figma: **about 716
> screens** in light and dark, **144 components** (391 variants), **81 icons** and a **28-slide brand deck**. Much of it
> ran overnight. Every lesson from that build is in these skills.

## What you get

- **Every screen a person can reach**, with its loading, empty and error states, sheets and dialogs, laid out by area
  and flow, with notes on motion and what is not drawn.
- **Light and dark as one frame**, switched by variable modes. Flip the whole page with one click.
- **A real design system**: your colours, sizes and type as Figma variables and styles, your icons, and every shared
  component with its variants. Change a component, and every screen updates.
- **Editable layers, not screenshots.** Every word comes from your code.
- **An optional brand deck** to present the design to your team.
- **A weekly drift check** that tells you what changed in the code since the last sync, plans the redraw, and asks
  before it touches anything.

Works for mobile apps (React Native, Swift, Kotlin, Flutter) and web apps (React, Next.js, Vue and more).

## How it works

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

## Two skills

| Skill | Run it | What it does |
|---|---|---|
| [**figma-from-code**](skills/figma-from-code/) | Once | The first build: questions, checks, a map, a pilot, then batches you review. |
| [**figma-sync**](skills/figma-sync/) | After a change, each release, and weekly | Finds what changed since the last sync, checks the file's own rules, asks what to update, redraws it, records the sync. Works on any Figma file that mirrors your app, even one drawn by hand. |

Two, because they run at different times: you build once, but you keep it in step forever.

## Install

```bash
npx skills add matthewzammit/skills
```

Works with Claude Code, Cursor, Codex and [other agents](https://skills.sh). It asks which skills and agents to install;
add `-g` to install for every project.

Or as a Claude Code plugin:

```
/plugin marketplace add matthewzammit/skills
/plugin install matthewzammit-skills@matthewzammit
```

Then, in your app's repo, say **"rebuild our app in Figma from the code"**.

## What you need

- Claude Code, with a strong model to plan and review (we used Opus) and a faster one for batches (Sonnet).
- Your repo, and the app running locally (simulator, emulator or browser), so Claude can compare its work.
- Figma edit access, and the Figma plugin for Claude Code (or the Figma connector), signed in.
- If a font in your app is not a Google font: the font on your computer, and Claude in Chrome.

Read [the full guide](skills/figma-from-code/) for the lessons that cost us hours, and the limits.

## License

[MIT](LICENSE). Made by [Matthew Zammit](https://github.com/matthewzammit). If it helps, tell me what worked.
