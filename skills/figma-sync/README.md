# Figma sync

Keep a Figma copy of your app in step with the code. Use it after
[figma-from-code](../figma-from-code/) has built the file (install both: this skill uses some of its files).

A Figma copy of an app goes stale in a week. This skill finds where Figma is behind the code, asks what to update,
redraws it, and records the sync.

## Three ways to run it

| You type | When | What happens |
|---|---|---|
| `/figma-sync setup` | Once per repo | Adds a sync record (`figma-sync.json`), a diff script (`figma-diff.js`) and its config to your repo, written from your product's screens. |
| `/figma-sync` (or a PR number, or a branch) | After a change, or at each release | Lists what changed since the last sync, redraws it in every theme, reviews it, and records the new sync on a branch with a pull request. |
| `/figma-sync check` | Weekly, on a schedule | Finds the gaps, plans each one with a size, asks which to update, and waits. It changes nothing until you pick. |

When installed as a Claude Code plugin, the command is `/matthewzammit-skills:figma-sync`.

## What it checks

- **The code:** every screen, component and token file changed since the last synced commit, grouped by the Figma
  section that draws it, and any new screen that no section covers.
- **The file itself:** every expected section and full-screen overlay exists, themes are set only where allowed, no
  helper layers are left behind, no text is left in the font stand-in, nothing overlaps.

## The weekly drift check

Schedule `/figma-sync check` once a week in the Claude desktop app (Code tab, Scheduled) or in the cloud. The prompt
to paste and the steps are in [templates/drift-check-routine.md](templates/drift-check-routine.md).

## The rule for designers

The mirror pages show the product **as shipped**. Comment freely. Try ideas on the Proposals page. An idea reaches the
mirror only after it ships in code.
