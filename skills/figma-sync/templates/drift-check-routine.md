# Weekly Figma drift check

A scheduled task that runs `figma-sync` in check mode once a week. It finds the gaps, plans each one, asks which to
update, and waits. **It changes nothing until you pick.** You answer in the same session, and it builds only what you
picked.

## Schedule it

**On your computer** (it can use Claude in Chrome for the brand font, and your installed skills): in the Claude desktop
app, open the Code tab, then Scheduled, then New task. Under Advanced settings, turn on "Only on this computer", pick
your repo's folder, set it to Weekly (for example Monday 10:00), paste the prompt below, and create it. It runs while
the app is open and the computer is awake; a missed run starts on the next launch.

**In the cloud** (runs with the laptop closed): `/schedule` in Claude Code, or New task at claude.ai/code/routines.
A cloud run gets a fresh clone of the repo and does not load your installed plugins, so commit the skills to the repo's
`.claude/skills/` folder first. It cannot use your browser, so it can report but not do the brand font swap.

Both are research previews. Check the current docs if a menu has moved.

## The prompt

Fill the `<...>` and paste it as the task's prompt.

```
Run the weekly Figma drift check for <product>: use the figma-sync skill with the argument "check".

- Repo: <path or repo name>. Main branch: <main>. Figma file: <URL>.
- Read-only until I pick: do not edit the Figma file, change code, commit or push in steps 1 to 3.
- Write the record to <~/.claude/figma-drift/YYYY-MM-DD.md> (use the real date): the range checked, each check with
  its result, and the numbered plan.
- <If we use a ticket tool: open one parent item named "Figma drift check, YYYY-MM-DD" and one ticket per numbered
  item under it. Never reuse a previous week's parent.>
- Reply with one numbered line per item (what drifted, the Figma section, size S/M/L, its ticket), then ask:
  "Which should I update? Numbers, 'all' or 'none'." Then stop and wait.
- A clean week files nothing and replies "Figma drift check <date>: in step".
- When I pick: build only those, then mark the sync on a branch with a pull request only if every item was fixed.
  Never merge.
```

## Pause or test it

- Run it now from the scheduled task's page ("Run now").
- Pause it by turning the task off.
- Dry run the code side by hand: `node scripts/figma-diff.js --to origin/main`.
