<p align="center">
  <img src="../../assets/figma-from-code.png" alt="Figma from code: your app's code on the left, Claude Code in the middle, and on the right a Figma file with screens in light and dark, an empty state, and a design system of colours, buttons and components." width="100%">
</p>

# Figma from code

**Build your Figma from your codebase.** Your agent rebuilds your mobile or web app in Figma from its code: every
screen in light and dark with its loading, empty and error states, responsive web views, a design system of real
components and variables, and a brand deck if you want one. [figma-sync](../figma-sync/) then keeps it updated as
the code changes.

With AI building the product, nobody draws every screen in Figma first. But Figma is still the best place to review
with your team, find any screen, and make marketing assets. This gives you that file, from the code you already have.

Every screen is built from editable components, colour variables and text styles, not screenshots. Change a
component, and every screen updates.

> Made by [Matthew Zammit](https://github.com/matthewzammit) while building the [Binderr](https://binderr.com) Wallet
> app. We rebuilt the app this way in two days: about 716 screens in light and dark, 144 components (391 variants),
> 81 icons and a 28-slide brand deck. These skills hold what worked and what went wrong, so you do not repeat our
> mistakes.

---

## Install

Install both: figma-from-code builds the file, figma-sync keeps it updated.

```bash
npx skills add matthewzammit/skills --skill figma-from-code --skill figma-sync
```

It works in Claude Code, Cursor, Codex and other agents. It asks where to install: this project only, or global
(every project on your computer). Run it again to update.

Or as a Claude Code plugin, which installs all the skills in this repo:

```
/plugin marketplace add matthewzammit/skills
/plugin install matthewzammit-skills@matthewzammit
```

Or copy the two folders into `~/.claude/skills/` (for you) or `<your repo>/.claude/skills/` (for your team).

Then, in your app's repo, say "rebuild our app in Figma from the code", or type `/figma-from-code`
(`/matthewzammit-skills:figma-from-code` when installed as a plugin). Claude reads your code first, then asks only what
it cannot find out: your Figma file, what to build first, the default theme, which version of the app, your old
designs, web widths, who reviews. It tests every font your code uses before it draws anything.

## What you get

Up to four Figma pages, built from your code:

| Page | What it holds |
|---|---|
| **Screens** | Every screen a person can reach, in light and dark, with its states, sheets and dialogs. One row per area of the product, one section per flow, notes beside each flow. |
| **Design System** | Your colours, sizes and type as Figma variables and styles, your icons, and every shared component with its variants. |
| **Brand Guideline** | A short deck (20 to 30 slides) to present the product's design. Optional. |
| **Proposals** | An empty page where designers try ideas. The other pages mirror the shipped product. |

Start with the design system and a few screens. Add the rest after you have reviewed them.

Works for **mobile apps** (React Native, Swift, Kotlin, Flutter) and **web apps** (React, Next.js, Vue and so on).
The skill sees which one you have and changes the steps. For the web it reads your breakpoints and draws responsive
views: desktop and mobile for every screen, and tablet where the layout changes. We used it on a React Native app,
and a second team used an earlier version on a web platform; the web steps in this form are newer, so tell me what you
find.

## Why you need it

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

| Skill | When | What it does |
|---|---|---|
| `figma-from-code` | Once, for the first build | Asks a few questions, checks your setup, maps the product, then builds it in Figma in batches while you review. |
| `figma-sync` | After a change, at each release, and weekly | Finds what changed in the code since the last sync, checks the Figma file's own rules, asks what to update, redraws it, and records the sync. |

## What you need first

- **Claude Code** with a strong model (we used Opus to plan and review, and Sonnet to build batches).
- **Your repo** on your computer, and the app running locally (simulator, emulator or browser), so Claude can compare
  its Figma screens with the real product.
- **Figma edit access** to the file. A view-only seat cannot write.
- **The Figma plugin for Claude Code** (or the Figma connector), signed in. It gives Claude the `use_figma` tool and
  Figma's own skills (`figma-use`, `figma-generate-design`, `figma-generate-library`).
- **If any font in your app is not a Google font** (a licensed brand font, say): the font installed on your computer,
  the **Claude in Chrome** extension, and Figma open and signed in in that Chrome. The skill checks every font your code
  uses first and tells you exactly what to set up before it builds. See "The font problem" below.

## Lessons that cost us hours

**The font problem.** Claude's Figma tool runs on Figma's servers. It can only load fonts those servers have (Inter,
Google Fonts). A font installed only on your computer fails, and so does any text the tool writes in it. What works:
build every text style in Inter as a stand-in, then switch the styles to your brand font from Figma in your own
browser (Claude in Chrome) or with the small desktop plugin in this repo. When the tool must write text again later,
switch back to Inter first. If your Figma plan has shared organisation fonts, check whether the tool can load yours.

**Build from the code, never from screenshots.** Every word comes from the code. Screenshots of the running app are
only for checking layout.

**Light and dark are one frame**, with a different variable mode, never two drawings. Set the theme once, on the page.

**Map before you draw.** Every route, every full screen with no route (offline, update required, a lock screen, a
splash), every state. Agree the map and the batch order with a person before building.

**Pilot first.** Build two or three screens, review them hard, fix the patterns. Every later batch copies the pilot,
mistakes included.

**One writer at a time.** Two agents writing to one Figma file at once corrupt each other's work.

**Write a brief and a progress file per batch.** The build agent gets the brief, not the chat. If the laptop sleeps,
the next run reads the progress file and carries on.

## Keeping it updated

A Figma copy of an app goes stale in a week. The `figma-sync` skill sets up three things in your repo:

1. **A sync record** (`figma-sync.json`): the last commit Figma matches.
2. **A diff script** (`figma-diff.js` with a small config): lists every screen, component and token changed since that
   commit, grouped by the Figma section that draws it, and any new screen no section covers.
3. **A routine**: sync once per release, plus a **weekly drift check**. The drift check runs on a schedule, finds the
   gaps (code changes and broken file rules), plans each one with a size, asks you which to update, and waits. It
   changes nothing until you pick. See
   [figma-sync/templates/drift-check-routine.md](../figma-sync/templates/drift-check-routine.md).

The rule for designers: the mirror pages show the product **as shipped**. Comment freely. Try ideas on the Proposals
page. An idea reaches the mirror only after it ships in code.

## What is in these folders

```
skills/
  figma-from-code/        the first build
    SKILL.md
    references/           build rules, web apps, the font problem, brand deck, checklist
    templates/            batch brief, progress file
    scripts/prelude.js    helpers to paste into each Figma script
    font-swap-plugin/     a Figma desktop plugin, and a console version for Chrome
  figma-sync/             keeping it updated (works on its own too)
    SKILL.md
    references/           setup questions and the diff, the file rules, build rules, the font problem
    templates/            the weekly drift check routine, the batch brief
    scripts/              figma-diff.js, an example config, tests
```

## Limits

- Figma does not show motion or haptics. The notes beside each flow describe them.
- Native blur and glass show as flat fills.
- System controls (pickers, camera, share sheet, browser chrome, payment iframes) are listed as not drawn.
- It costs agent time: a product of about 80 screens took us eight batches of one to three hours each.

## Related projects

Other people working on code to Figma. Some of the checks here (reading token values back, the file registry, the
rebind sweep, pre-captured web references) were learned from them.

- [bitovi/ai-enablement-prompts: figma-from-code](https://github.com/bitovi/ai-enablement-prompts/tree/main/plugins/figma-from-code):
  a web app rebuilt by phase subagents, with pre-captured references and pixel diffs.
- [charun-meedate/code-to-figma](https://github.com/charun-meedate/code-to-figma): a codebase mirrored as documentation,
  with token values checked one by one.
- [redongreen/uSpec](https://github.com/redongreen/uSpec): design system specs rendered into Figma.
- [alima-max/prototype-to-figma-skill](https://github.com/alima-max/prototype-to-figma-skill): a prototype turned into
  annotated frames per state.
- [awdr74100/figwright](https://github.com/awdr74100/figwright): an MCP server and skill for writing to Figma.
- [Figma's own MCP skills](https://github.com/figma/mcp-server-guide): `figma-use`, `figma-generate-design` and
  `figma-generate-library`, which these skills build on.

## License

MIT. Use it, change it, share it. If it helps, tell me what worked and what did not.
