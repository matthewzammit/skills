# Weekly progress note routine

A scheduled task that drafts the note every Monday morning, for the week that just ended, and waits for you. **It
never posts.** You read it, edit it, send it yourself, and paste back what you sent so next week's note can compare.

## Schedule it

In the Claude desktop app, open the Code tab, then Scheduled, then New task. Under Advanced settings, turn on "Only
on this computer", pick your repo's folder, set it to Weekly (for example Monday 09:00), paste the prompt below,
and create it. It runs while the app is open and the computer is awake; a missed run starts on the next launch.

In the cloud (`/schedule` in Claude Code, or New task at claude.ai/code/routines) works too, since the note needs
only git and `gh`. Commit the skill to the repo's `.claude/skills/` first; a cloud run does not load your
installed skills, and it cannot read a log kept outside the repo.

Both are research previews. Check the current docs if a menu has moved.

## The prompt

Fill the `<...>` and paste it as the task's prompt.

```
Draft this week's progress note for <repo>: use the weekly-progress-note skill for last week.

- Repo: <path>. Main branch: <main>. Log of sent notes: <log folder>.
- Read only: do not edit, commit, push or pull. Read origin/<main> after `git fetch --tags --quiet`.
- Never post the note anywhere and leave the clipboard alone. Write the draft to <draft file> and show it.
- Reply with the note in one code block, what you used, last week's plan against what happened, and anything you
  were unsure of. Then stop.
- When I paste back what I sent: save it to the log, as the skill says.
```

## Pause or test it

- Run it now from the scheduled task's page ("Run now").
- Pause it by turning the task off.
