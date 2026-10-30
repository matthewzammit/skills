# Batch brief (template)

Copy this file, fill every `<...>`, save it next to the progress file, and give it to one build agent as its first
prompt. One batch at a time per Figma file.

---

You are building batch <N> of a Figma rebuild of <product> FROM ITS CODE, so the design team reviews and edits real
components. <Batches 1 to N-1 are done; follow their patterns exactly.> Figma only: leave the repo unchanged.

## Your job

**<Area>.** Every screen in scope, with all its states, in every theme: loaded, loading, empty, error, every variant
the code renders differently, and every sheet, dialog and sub-page it opens. Every new building block becomes a
component on the design system page, in the right group.

- Files to read (follow their imports): <route files>
- Sections to make: <names>, on page <name> `<id>`, starting at <x, y> as the page plan sets, 200 apart.
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
- Themes: the page's default mode is <mode>. Frames follow the page, except "/ Light" + "/ Dark" pairs (only for:
  <key screens>) and "(always <theme>)" screens and parts (<list from the code>).
- Repeated states drawn once per kind (a validation error, saving): <which, and on which screen>.

## Rules

<paste references/build-rules.md here, plus any rule the person gave>

## Running product

<how to open it: simulator and deep links, the dev server URL and test account, or the folder of reference pictures;
how to take a screenshot. Look, then go back: never submit, save, send, pay or delete.>

<Only if the person allowed actions on a test account: quote their own words here, and require a "created and cleaned
up" log. A helper ignores permissions relayed after its first prompt.>

## Progress file

Keep section ids, frame ids and what is left in `<path>/batch<N>-state.md`. Update it after each section, so the work
can resume if it stops.

## Report

Done when: the rebind sweep (build rules) finds no unbound colour that matches a token and no text off a text style
on every frame you made, and a `get_screenshot` of each section shows nothing clipped, overlapping, outside its place
or showing placeholder text.

Write the report to `<path>/batch<N>-report.md` and reply with only its path. The report, per section: frame ids per
screen and state; new component ids and their group; the frames you compared with the running product; the colours
the sweep could not bind; every string you could not source; every deviation from the code; what you did not draw and
why; the text you left alone; every shared component you changed (the reviewer re-checks earlier frames that use it).
