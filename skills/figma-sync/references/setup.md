# Setup: the sync record, the diff and the routine

Do this once per repo, after the first build (or now, if Figma already matches the code). The repo parts go on a
branch and a pull request like any other change.

## 1. The diff script

1. Copy `${CLAUDE_SKILL_DIR}/scripts/figma-diff.js` into the repo's scripts folder (for example `scripts/figma-diff.js`).
   It needs only Node 18 or newer.
2. Copy `${CLAUDE_SKILL_DIR}/scripts/figma-sync.config.example.js` to the repo root as `figma-sync.config.js`, and
   write it from the product map:
   - `uiPaths`: the folders that hold screens, components and tokens (plain folders, not globs).
   - `routeFiles`: how to list screen files, so a new screen with no Figma section is caught.
   - `ignore`: developer labs, tests, layout files.
   - `rules`: one per Figma section, `[regex, [section names]]`. The first match wins, so put narrow rules above broad
     ones. Section names are the names on the Screens page.
   - `designSystem`: the section name for the design system page, with a rule that sends shared components and token
     files to it.
   - `overlays`: full screens with no route (offline, update required, lock, splash) and a regex for each one's frame
     name.
3. If the repo has a test runner, add a test for the config's rules beside it (the shape is in
   `${CLAUDE_SKILL_DIR}/scripts/figma-diff.test.js`, run with `node --test path/to/*.test.js`).
4. Add a package script if the repo uses them: `"figma:diff": "node scripts/figma-diff.js"`.

## 2. The record

When Figma matches the code: `node scripts/figma-diff.js --mark`. That writes `figma-sync.json` with the commit and the
date. Run the diff again: it should say Figma is in step.

## 3. The routine

- **Once per release:** add a step to the release checklist: run `figma-sync`, redraw what changed, mark the sync.
- **Weekly:** a scheduled drift check. The prompt and how to schedule it are in
  [../templates/drift-check-routine.md](../templates/drift-check-routine.md).

## 4. Write it down

Add a short guide to the repo's docs: where the Figma pages are, how they stay in step, and the rule for designers
(the mirror shows the product as shipped; comment freely; try ideas on the Proposals page; an idea reaches the mirror
only after it ships in code). Add one line to the team's design or development principles that points to it.
