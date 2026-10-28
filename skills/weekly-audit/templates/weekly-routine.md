# Weekly audit routine

A scheduled task that runs `weekly-audit` every Monday over the code that changed since the last run. It reviews,
writes the record, files tickets if you set that up, and runs fixes only if you switched them on. **It never merges
and never posts anywhere you did not approve.**

## Schedule it

**On your computer** (recommended: your installed review skills, your `gh` sign-in and your ticket tool are all
here): in the Claude desktop app, open the Code tab, then Scheduled, then New task. Under Advanced settings, turn
on "Only on this computer", pick your repo's folder, set it to Weekly (for example Monday 09:00), paste the prompt
below, and create it. It runs while the app is open and the computer is awake; a missed run starts on the next
launch.

**In the cloud** (`/schedule` in Claude Code, or New task at claude.ai/code/routines) gets a fresh clone. It does
not load your installed skills, so commit the review skills the repo needs into its `.claude/skills/` first, and
check the ticket tool works without your sign-in. A cloud run that cannot reach a skill says so in the record's
"Not checked" section.

Both are research previews. Check the current docs if a menu has moved.

## The prompt

Fill the `<...>` and paste it as the task's prompt.

```
Run /weekly-audit on <repo path>.

This run is non-interactive: never ask me a question. Where the skill would ask, take its recommended answer.

- Scope: the commits since the end commit of the newest record in <records folder>. If there are none, write
  nothing and end with "Nothing changed since <date>."
- Write the record to <records folder>/<today>.md. Do not commit it.
- <If we file tickets: file them with <how>. Open a new group named "Weekly audit, <today>" only when there is at
  least one verified finding. Carry still-open tickets over from last run's group. Never file into an earlier or
  a closed group.>
- Fixes: run step 6 only if the config has "fixes": true and no .weekly-audit-off file exists. One draft pull
  request per clean finding, never merge.
- Post nowhere. End with the summary from the skill's templates/summary.md: progress first, then draft pull
  requests, then decisions needed, then carry-over.
```

## Pause or test it

- Run it now from the scheduled task's page ("Run now").
- Pause it by turning the task off.
- Stop fixes at once, without editing the schedule: create an empty `.weekly-audit-off` file in the repo root or
  the records folder. Delete it to turn fixes back on.
- Dry run by hand: run `/weekly-audit last 7 days` in the repo and read the record before you schedule anything.
