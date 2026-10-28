# Weekly CI audit

A scheduled task that runs `ci-audit` once a week, on Monday, over the week before. It measures, writes the
report and the trend row, proposes fixes, and waits. **It changes no code until you pick.** You answer in the same
session, and it builds only what you picked.

## Schedule it

**On your computer** (recommended: the transcripts are here, and so is your `gh` sign-in): in the Claude desktop
app, open the Code tab, then Scheduled, then New task. Under Advanced settings, turn on "Only on this computer", pick
your repo's folder, set it to Weekly (for example Monday 09:00), paste the prompt below, and create it. It runs
while the app is open and the computer is awake; a missed run starts on the next launch.

**In the cloud** (`/schedule` in Claude Code, or New task at claude.ai/code/routines) sees only CI: a cloud run
has a fresh clone and none of your transcripts, so the agent-time and gate parts come back "not checked". Commit
the skill to the repo's `.claude/skills/` first; a cloud run does not load your installed skills.

Both are research previews. Check the current docs if a menu has moved.

## The prompt

Fill the `<...>` and paste it as the task's prompt.

```
Run the weekly CI audit for <repo>: use the ci-audit skill for last week.

- Repo: <path>. Main branch: <main>. Records: <records folder>.
- Read-only until I pick: do not edit code, commit, push, re-run or cancel workflows, or start builds, servers or
  simulators. The only files you write are the report and the trend row.
- <If we use a ticket tool: open one parent item named "CI audit, YYYY-MM-DD" and one ticket per proposed fix
  under it. Never reuse an earlier week's parent.>
- Reply with minutes lost per area, what broke, what got slower or faster, and the numbered fixes ranked by minutes
  saved, then ask "Which should I build? Numbers, 'all' or 'none'." and stop.
- When I pick: build only those on a new branch, open a pull request, never merge.
```

## Pause or test it

- Run it now from the scheduled task's page ("Run now").
- Pause it by turning the task off.
- Dry run the numbers by hand: the four commands in the skill's step 3, with `--days 7`.
