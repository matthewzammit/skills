---
name: figma-sync
description: Keep a Figma copy of an app (screens, design system, brand deck) in step with its code - set up a sync record and diff, redraw what changed after a release or a merged change, and run a weekly drift check that asks before it changes anything. Works with any Figma file that mirrors the app, built by figma-from-code or by hand. Use when someone asks whether Figma is up to date, wants Figma updated after interface changes, or wants a drift check scheduled.
argument-hint: "[setup | check | a PR number | a branch]"
---

# Figma sync

The Figma pages mirror the app **as shipped**, and the code is the source. This skill finds where Figma is behind,
asks what to update, redraws it, and records the sync.

Talk to the person in short, plain sentences, with a recommendation. Never ask what the repo or Figma can answer.

Scope from `$ARGUMENTS`:
- **setup**: first time in this repo. Follow [references/setup.md](references/setup.md), which asks the person a few
  questions, then stop.
- **empty**: every change since the last sync.
- **a PR number or a branch**: only that change.
- **check**: the weekly drift check. Steps 1 to 3 only. Nothing changes until the person picks.

If the repo has no sync record (`figma-sync.json`) or no `figma-sync.config.js`, run setup first.

Read once: [references/build-rules.md](references/build-rules.md). Load Figma's `figma-use` skill before any
`use_figma` call.

## 1. Find the code gaps

1. `git fetch`, then from the repo root: `node <the repo's figma-diff.js> --to origin/<main branch>` (add `--json` for
   the routine). For a PR, keep only the files in `gh pr diff <n> --name-only`; for a branch, use `--to origin/<branch>`.
2. For each listed section, read the commits on its files (`git log`, `git show`) and write one line: what a person now
   sees differently. A change with nothing to see (motion only, analytics, a rename, a refactor) is **not a gap**:
   name it and say why.
3. Each **unmapped file** or **screen with no section** is a gap too: a new screen Figma may lack, or a rule missing
   from `figma-sync.config.js`.
4. Read the Figma frames for each gap (a read-only `use_figma` call, or `get_screenshot`). A frame already drawn from the
   current code is **in step**.

Done when: every listed section and file is one of gap (with its frames and states), in step, or not a gap (with why).

## 2. Check the file's own rules

Read-only `use_figma` calls, one page per call, following [references/file-rules.md](references/file-rules.md): every
expected section and full-screen overlay exists, themes are set only where allowed, no helper layers, no text left in
a font stand-in, nothing overlapping. Each violation is a gap.

Done when: every rule in that file has a result.

## 3. Plan and ask

Give each gap a short plan: what changed for a person, which frames and states to redraw (every theme), any component
to add or change, and a size (S: one frame or a fix, M: a section, L: several sections or a new flow). Group gaps that
belong to one flow.

If the team tracks work in a ticket tool (setup recorded which), file one ticket per item under one parent for this
run. Reply with the numbered list and ask: "Which should I update? Numbers, 'all' or 'none'." When the person ran this
by hand to sync, ask only about a gap that needs a design decision and build the rest.

**In check mode, stop here and wait.** A clean run files nothing and says "Figma is in step".

Done when: the person has picked, or the run was clean.

## 4. Build what was picked

1. **Fonts.** Setup recorded which fonts the Figma tool cannot load (or test each family now with
   `figma.loadFontAsync` in `use_figma`). If any failed, ask the person for their Chrome with the Figma file open, then
   switch the text styles to the Inter stand-in ([references/font-problem.md](references/font-problem.md)).
2. Brief one build agent per item, **one at a time** (two writers on one file corrupt work), from
   [templates/batch-brief.md](templates/batch-brief.md): the commits to read for exact copy, the frames and their ids.
   Every state in every theme; every word from the code. Match the patterns already on the page.
3. Review each result yourself: `get_screenshot` of every changed frame in every theme, and the running product where
   the screen is reachable. Check the copy word for word against the code.
4. Switch the text styles back to the brand font, and edit any text the tool could not write.

Done when: every picked gap is drawn and reviewed, and no text is left in the stand-in.

## 5. Record the sync

- **Every gap drawn:** on a branch, `node <figma-diff.js> --to origin/<main branch> --mark`, commit `figma-sync.json`,
  open a pull request.
- **A gap left open:** leave the record alone. A mark would hide the gap from the next check. List what is left.

Report: what changed in Figma, what was in step or not a gap, and whether the sync is marked.
