# Batch brief (template)

Copy this file, fill every `<...>`, save it next to the progress file, and give it to one build agent. One batch at a
time per Figma file.

---

You are building batch <N> of a Figma rebuild of <product> FROM ITS CODE, so the design team reviews and edits real
components. <Batches 1 to N-1 are done; follow their patterns exactly.> Figma only: leave the repo unchanged.

## Your job

**<Area>.** Every screen in scope, with all its states, in every theme: loaded, loading, empty, error, every variant
the code renders differently, and every sheet, dialog and sub-page it opens. Every new building block becomes a
component on the design system page, in the right group.

- Files to read (follow their imports): <route files>
- Sections to make: <names>. Place them <where>, 200 apart.
- Widths (web only): <1440 and 390 for every screen and state; 768 for: list of screens whose layout changes there>.
- Not drawn: <system controls, unreachable screens>. Say so in the notes.
- Text to leave alone and list instead: <card titles, notes, anything in the brand font outside the text styles>.

## Before any Figma write

- Load the skills `figma-use`, `figma-generate-design` and `figma-generate-library`; pass `skillNames` on every call.
- First call, read-only: list every component and component set on the design system page (name, id, variants,
  properties), every icon, and the variables and text styles. Reuse what exists.
- Paste the shared helpers (`scripts/prelude.js` in the figma-from-code skill, or your own) at the top of each write
  script, with `ID` filled from that listing.

## The file

- fileKey `<key>`. Pages: Screens `<id>`, Design System `<id>`.
- Patterns to copy: <frame ids of a pushed page, a sheet, a state row, a notes column>.
- Themes: the page's default mode is <mode>. Frames follow the page, except "/ Light" + "/ Dark" pairs and
  "(always <theme>)" screens.

## Rules

<paste references/build-rules.md here, plus any rule the person gave>

## Running product

<how to open it: simulator and deep links, or the dev server URL and test account; how to take a screenshot. Look,
then go back: never submit, save, send, pay or delete.>

## Progress file

Keep section ids, frame ids and what is left in `<path>/batch<N>-state.md`. Update it after each section, so the work
can resume if it stops.

## Report (short)

Per section: frame ids per screen and state. New component ids and their group. Which frames you compared with the
running product. Every string you could not source. Every deviation from the code. What you did not draw and why. The
text you left alone. Finish with `get_screenshot` of each section: nothing clipped, overlapping, at the origin or
showing placeholder text.
