---
name: figma-from-code
description: Rebuild a mobile app or a web app in Figma from its code - every screen in light and dark with its states, responsive desktop, tablet and mobile views for the web, a design system of components and variables, an optional brand deck - in reviewed batches. Use when someone wants their app, product or design system mirrored, rebuilt or documented in Figma from the codebase. For updating an existing mirror after code changes, use figma-sync instead.
---

# Figma from code

Rebuild the product in Figma **from its code**, so designers review and edit real components. You plan and review;
build agents draw batches from written briefs; a person approves the map, the pilot and each batch.

Talk to the person in short, plain sentences. Give a recommendation, not a survey. Never ask what the repo or Figma
can answer. Ask the rest together.

Read before the first Figma write: [references/build-rules.md](references/build-rules.md). For a web app, also
[references/web-apps.md](references/web-apps.md). Load Figma's own skills before any `use_figma` call: `figma-use`
always, `figma-generate-design` for screens, `figma-generate-library` for the design system, and pass their names in
`skillNames`.

## 1. Ask what you cannot find out

Start here, before reading any Figma file. Look first: the product type, tokens, routes, fonts and themes are in the
code. Say in two lines what you found (for example "An Expo app, 84 screens, light and dark, one local font"). Then ask
only what is left, with the question tool if you have one (at most 4 questions a round, two rounds at most), each with
your recommendation first:

1. **The Figma file**: its URL, and whether to make new pages or use existing ones. Recommend a file of its own per
   product. Never write over a page with content.
2. **What to build**: screens, design system, brand deck, or all. Recommend the design system plus a few key screens
   first.
3. **Themes**: light, dark or both, and which is the brand default (the page's default mode).
4. **Which version**: if the code has feature flags or an old and a new design, which one Figma shows.
5. **Existing designs**: an older Figma file or library. Mirror the code, keep the old pages, say where they differ.
6. **Web only**: the responsive views. Read the breakpoints from the code first (Tailwind screens, CSS media
   queries, the component library's theme). Recommend every screen and state at desktop (1440) and mobile (390), and
   tablet (768) for each screen whose layout changes there. Also a test account on a local or staging server, never a
   real customer account.
7. **Who reviews**, and whether work is tracked in a ticket tool.
8. **Fonts**: run the font check from step 2 now. For any font the Figma tool cannot load, tell the person what they
   must set up, so a long run does not stop halfway.

Add no rule the person did not give. An agent once wrote "draw extra states in light only" into a brief; nobody asked
for it. If a rule is not here or from the person, ask.

Done when: every item above is answered from the code or by the person.

## 2. Check every access

Report one line per check: ok, or what the person must do.

| Check | How | If it fails |
|---|---|---|
| Figma tool | Load the Figma tools; call `whoami`. | Install or sign in to the Figma plugin or connector. |
| Read | A read-only `use_figma` that lists the pages. | Wrong URL, or no access. |
| Write | Ask first. Make one rectangle off to the side, read it back, delete it. | View-only seat. |
| Fonts | Every font family the code uses, each tested in `use_figma` (see "Fonts" below). | Follow [references/font-problem.md](references/font-problem.md): the person sets up Chrome access before the build. |
| Running product | Start the simulator, emulator or dev server; take one screenshot. | Build from code anyway, and say nothing was compared. |
| Sample data | Find the demo account or seed data the product ships. | Use only invented data. Never a real person's details or photo. |
| Images | Find where logos and pictures come from. | Ask before downloading or uploading any image. |
| Colour profile | Read the file's colour profile (File > Color profile). Code colours are sRGB. | A Display P3 file shifts sRGB values (we saw 20/255 off). Ask to switch the file to sRGB before building. |
| Variable modes | Make a test collection with two modes, then delete it. | The plan allows one mode only: light and dark need a paid plan, or a second collection. Tell the person. |
| Long runs | For overnight work: laptop plugged in, the session allowed to run without asking each step. | Run during the day. |

Done when: every row is ok, or the person has agreed to the fallback.

### Fonts

Claude's Figma tool runs on Figma's servers and loads only the fonts they have (Inter, Google Fonts). A brand font
installed only on the person's computer fails, and so does any text written in it. This cost us hours, so check it
before anything else is drawn.

1. **Find every font family** the product uses: the theme and token files, CSS `@font-face` and `font-family`, a
   Tailwind config, `next/font`, native font files (`.ttf`, `.otf`) and the app config that loads them. Note each family
   and its weights or styles. Icon fonts count too.
2. **Test each one** in `use_figma`: `await figma.loadFontAsync({ family, style })` for every style the code uses.
3. **For each font that fails**, tell the person plainly, in one message, what they need and why:
   - the font installed on their computer;
   - the **Claude in Chrome** extension installed, and their OK for you to open and use a Figma tab in their Chrome;
   - **signed in to Figma in that Chrome**, with Figma's font installer so the browser can see local fonts;
   - or, without Chrome: the small Figma desktop plugin in [font-swap-plugin/](font-swap-plugin/), which they run.
   Then build every text style in Inter as a stand-in, and swap at the end
   ([references/font-problem.md](references/font-problem.md)).
4. **Run the browser check** once the person has set it up, and before the build starts.

If every font loads in `use_figma`, none of this applies: build in the real fonts.

## 3. Map the product

Read the code and write a map. Draw nothing yet.

- **Areas and flows**: every route, grouped by area, in the order a person meets them.
- **Full screens with no route**: offline, update required, lock, splash, a first-run intro. These are easy to miss.
- **States per screen**: loaded, loading, empty, error, every variant the code renders differently, every sheet,
  dialog and sub-page.
- **Not drawn**: developer and debug screens, unreachable routes, flags the person did not choose. List each with why.
- **Foundations**: token files (colours per theme, spacing, radius, type, shadows), the icon source, the shared
  components folder.

Show the person the counts (areas, flows, screens, states, components) and a batch order. Save the map to a file
outside the repo so a later session can resume.

Done when: the person has approved the map and the batch order.

## 4. Build in batches

```
  1. Foundations   variables, text styles, shadows, icons        (you)
  2. Pilot         2 or 3 screens, light and dark, + components   (you)
        |          the person reviews; fix the patterns now
  3. Batches       one area each, about 4 to 6 flow sections     (build agent, from a brief)
        |          you review each batch before the next starts
  4. Tidy pass     layout, names, notes, contents, coverage      (you)
  5. Brand deck    if asked: references/brand-deck.md             (you)
  6. Font swap     if a font failed the check in step 2           (you)
```

- **Foundations come from this product's code**: one colour collection with a mode per theme, variables named after
  the code tokens (the token in each description), text styles named `Type/<name>`, shadows as effect styles. Text
  styles use Inter as a stand-in for any font that failed the check in step 2. **Foundations are done when the values
  read back right:** a read-only `use_figma` dump of every variable in every mode, compared value by value (alpha
  included) with the code tokens. A matching count proves nothing; a wrong value hides behind the right name.
- **One registry for the file**: every page, section, component and frame id you create, in the progress file's
  Registry, written after each create. **On resume**, re-read it and confirm the ids still exist (`get_metadata`)
  before writing. A missing id means stop and ask, never recreate it silently.
- **One batch at a time, one writer per file.** Never run two agents against one Figma file.
- **Each batch gets a brief** ([templates/batch-brief.md](templates/batch-brief.md)) and **a progress file**
  ([templates/progress-file.md](templates/progress-file.md)). The build agent gets the brief, not the chat history.
  Paste [scripts/prelude.js](scripts/prelude.js) into its scripts.
- **Batch size**: 80 to 150 frames. Bigger batches time out or lose track.

**Review each batch** before the next one starts, in this order:

1. `get_screenshot` of every section touched (at scale 1 when comparing with a capture).
2. **Same state first:** for each reachable screen, check the Figma frame and the running product show the same state
   (same data, same open sheet, same theme). A different state fails, whatever it looks like.
3. **Size:** the frame is the device or breakpoint size, not collapsed to hug its content.
4. **Edges:** a button, card or field out of place fails at any size; a small overall difference can hide one. Decide
   at the pilot which differences do not count (text rendering, line breaks) and write them in the brief.
5. **Components, not drawings:** count the instances in each screen against the components the code uses there. A
   piece drawn as plain shapes or text where the code uses a component fails.
6. **Notes and themes:** check one or two note claims per section against the code; switch the page theme and back.

Fix what is off, then tell the person what was built, what was compared, and what was not drawn and why.

Done when: every screen and state on the approved map is drawn in every theme and reviewed, and the checklist in
[references/checklist.md](references/checklist.md) passes.

## 5. Set up keeping it in step

A Figma copy goes stale in a week, so this step is part of the build, not an extra. Tell the person why in one line,
then:

1. **Install figma-sync** if it is missing. Tell the person the command:
   `npx skills add matthewzammit/skills --skill figma-sync` (or the Claude Code plugin). Wait until it is installed.
2. **Run figma-sync with `setup`.** It adds the sync record and the diff script with a config written from the map,
   and records the build commit as the first sync. The repo parts go on a branch and a pull request.
3. **Offer the weekly drift check** and recommend it: it finds what changed each week, asks which to update, and
   changes nothing until the person picks. If they agree, walk them through scheduling it
   (figma-sync's `templates/drift-check-routine.md`: the steps, and the prompt filled in for this repo).
4. **Add a release step** to the team's release checklist: run figma-sync, redraw what changed, mark the sync.

Done when: the diff reports Figma in step at the build commit, and the person has said yes or no to the weekly check
(and it is scheduled if yes).

## 6. Hand over

In a few lines: the page links, the counts, what was compared with the product, what was not drawn and why, how to
switch the theme, and how it stays in step. Tell designers the rule: the mirror pages show the product as shipped;
comment freely; try ideas on the Proposals page.
