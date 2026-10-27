---
name: figma-sync
description: Bring a Figma mirror of an app (screens, design system, brand deck) back in step with the code after interface changes, then record the sync. Also the weekly drift check (pass "check" to report and ask without changing anything) and the one-time setup of the sync record and diff script. Use after a release, a merged change to screens, components or tokens, or when someone asks whether Figma is up to date.
argument-hint: "[check | setup | a PR number | a branch]"
---

# Figma sync

The Figma pages mirror the app **as shipped**, and the code is the source. This skill finds where Figma is behind,
asks what to update, redraws it, and records the sync.

Scope from `$ARGUMENTS`:
- **empty**: every change since the last sync.
- **a PR number or a branch**: only that change.
- **check**: the weekly drift check. Steps 1 to 3 only, and nothing changes until the person picks.
- **setup**: first time in this repo. Follow [references/setup.md](references/setup.md), then stop.

If the repo has no `figma-sync.json` yet, do the setup first.

This skill uses files from the `figma-from-code` skill: install both.

Read the build rules once: [../figma-from-code/references/build-rules.md](../figma-from-code/references/build-rules.md).
Load Figma's `figma-use` skill before any `use_figma` call.

## 1. Find the code gaps

1. `git fetch`, then run the diff against the main branch, from the repo root:
   `node <path to figma-diff.js> --to origin/main` (add `--json` for the routine). For a PR, keep only the files in
   `gh pr diff <n> --name-only`; for a branch, use `--to origin/<branch>`.
2. For each listed section, read the commits on its files (`git log`, `git show`) and write one line: what a person now
   sees differently. A change with nothing to see (motion only, analytics, a rename, a refactor) is **not a gap**:
   name it and say why.
3. Each **unmapped file** or **screen with no section** is a gap too: a new screen Figma may lack, or a rule missing
   from `figma-sync.config.js`.
4. Read the Figma frames for each gap (a read-only `use_figma` call, or `get_screenshot`). A frame already drawn from the
   current code is **in step**.

Done when: every listed section and file is one of gap (with its frames and states), in step, or not a gap (with why).

## 2. Check the file's own rules

Read-only `use_figma` calls, one page per call. The checks are in [references/file-rules.md](references/file-rules.md):
every expected section and full-screen overlay exists, theme modes are set only where allowed, no helper layers, no
text left in the font stand-in, nothing overlapping. Each violation is a gap.

Done when: every rule in that file has a result.

## 3. Plan and ask

Give each gap a short plan: what changed for a person, which frames and states to redraw (every theme), any component
to add or change, and a size (S: one frame or a fix, M: a section, L: several sections or a new flow). Group gaps that
belong to one flow.

If the team tracks work in a ticket tool, file one ticket per item (and group them under one parent for this run).
Reply with the numbered list and ask: "Which should I update? Numbers, 'all' or 'none'." Ask only about a gap that
needs a design decision; when the person ran this by hand to sync, build the rest.

**In check mode, stop here and wait.** A clean run files nothing and says "Figma is in step".

Done when: the person has picked, or the run was clean.

## 4. Build what was picked

1. If the brand font is local, switch the text styles to the Inter stand-in from the browser
   ([../figma-from-code/references/font-problem.md](../figma-from-code/references/font-problem.md)).
2. Brief one build agent per item, **one at a time** (two writers on one file corrupt work), from
   [../figma-from-code/templates/batch-brief.md](../figma-from-code/templates/batch-brief.md): the commits to read for exact
   copy, the frames and their ids. Every state in every theme; every word from the code.
3. Review each result yourself: `get_screenshot` of every changed frame in every theme, and the running product where
   the screen is reachable. Check the copy word for word against the code.
4. Switch the text styles back to the brand font, and edit any text the tool could not write.

Done when: every picked gap is drawn and reviewed, and no text is left in the stand-in.

## 5. Record the sync

- **Every gap drawn:** on a branch, `node <path to figma-diff.js> --to origin/main --mark`, commit `figma-sync.json`,
  open a pull request.
- **A gap left open:** leave the record alone. A mark would hide the gap from the next check. List what is left.

Report: what changed in Figma, what was in step or not a gap, and whether the sync is marked.
