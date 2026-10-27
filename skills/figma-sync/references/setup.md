# Setup

Once per repo. It works for any Figma file that mirrors the app: one built with figma-from-code, or one a team drew by
hand. The repo parts go on a branch and a pull request like any other change.

## 1. Look, then ask

Look first: the product type, the screen files (the router), the shared components and token files, the fonts, the
main branch name. Say in two lines what you found. Then ask only what is left, with the question tool if you have one
(at most 4 questions a round), each with your recommendation first:

1. **The Figma file**: its URL. Then read it (a read-only `use_figma` call that lists pages, sections and top-level
   frames) and propose which pages mirror the app: screens, design system, deck. Ask the person to confirm.
2. **Is Figma in step today?** If yes, the current commit becomes the first sync. If not, ask from which commit or date
   it was drawn, or record today and let the first check list everything since.
3. **Tickets**: does the team track work in a ticket tool (Jira, Linear, GitHub Issues, ClickUp...)? If so, how you
   file to it (a CLI, an API script, or the person files them from your list).
4. **The weekly drift check**: schedule it now (recommended), later, or never.

Then run the font check: every font family the code uses, each style tested with `figma.loadFontAsync` in
`use_figma`. For each one that fails, tell the person what they need before any redraw
([font-problem.md](font-problem.md)): the font installed, the Claude in Chrome extension with their OK to use a Figma
tab, and Figma signed in in that Chrome. Write the result in the repo's Figma guide (step 5).

Done when: every question is answered and the font check has a result.

## 2. The diff script

1. Copy `${CLAUDE_SKILL_DIR}/scripts/figma-diff.js` into the repo's scripts folder (for example `scripts/figma-diff.js`).
   It needs only Node 18 or newer.
2. Copy `${CLAUDE_SKILL_DIR}/scripts/figma-sync.config.example.js` to the repo root as `figma-sync.config.js`, and fill
   it from the code and the Figma file you read:
   - `uiPaths`: the folders that hold screens, components and tokens (plain folders, not globs).
   - `routeFiles`: how to list screen files, so a new screen with no Figma section is caught.
   - `ignore`: developer labs, tests, layout files.
   - `rules`: one per Figma section, `[regex, [section names]]`, using the **section names that exist in the file**.
     The first match wins, so put narrow rules above broad ones.
   - `designSystem`: the name of the design system section or page, with a rule that sends shared components and token
     files to it.
   - `overlays`: full screens with no route (offline, update required, lock, splash) and a regex for each one's frame
     name.
3. Run it. Every screen file should map to a section or be ignored on purpose. Fix the rules until "screens with no
   Figma section" lists only screens Figma really lacks; those become the first gaps.
4. If the repo has a test runner, add a test for the config's rules (the shape is in
   `${CLAUDE_SKILL_DIR}/scripts/figma-diff.test.js`; run it with `node --test path/to/*.test.js`).
5. Add a package script if the repo uses them: `"figma:diff": "node scripts/figma-diff.js"`.

## 3. The record

`node scripts/figma-diff.js --mark` (with `--to <commit>` for an older sync point). That writes `figma-sync.json` with
the commit and the date.

## 4. The routine

- **Once per release:** add a step to the release checklist: run figma-sync, redraw what changed, mark the sync.
- **Weekly:** if the person chose it, schedule the drift check from
  [../templates/drift-check-routine.md](../templates/drift-check-routine.md).

## 5. Write it down

A short guide in the repo's docs: where the Figma pages are, which fonts need the Chrome swap, how the pages stay in
step, and the rule for designers (the mirror shows the product as shipped; comment freely; try ideas on a Proposals
page; an idea reaches the mirror only after it ships in code). One line in the team's principles points to it.
