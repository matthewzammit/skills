---
name: weekly-progress-note
description: Drafts a short weekly progress note in plain words for a founder, PM or team - what shipped last week (5 to 8 lines naming features, never files or PR numbers) and a suggested plan for this week, checked against last week's plan - from merged pull requests, commits to the main branch, release tags, the changelog and closed tickets. Works for last week, the last 7 days or any two dates, on demand or as a Monday routine. Never posts. Use when someone asks for a weekly update, a progress note or summary, a "what did we ship" note, or wants one drafted every week.
argument-hint: "[setup | last-week | 7d | YYYY-MM-DD..YYYY-MM-DD]"
---

# Weekly progress note

Draft a short note that tells the team what shipped and what is next, in words anyone on the team understands.
**It is not a release log**: the changelog lists every change; this note names the few big topics. You draft it
and show it. **The person sends it.** You never post it anywhere.

## 1. Setup (first run, or `setup`)

If the repo has no config (`.progress-notes/config.json`, or `~/.claude/progress-notes/<repo>/config.json`, where `<repo>` is the
repo's name on GitHub, not its folder name), or
`$ARGUMENTS` is `setup`, follow [references/setup.md](references/setup.md): the default period, where the log of
sent notes lives, which sources exist, and whether to schedule it. Stop there if the argument was `setup`.

Done when: a config exists.

## 2. Period

Run `date` first. All dates are local, and a period always runs from 00:00 on its first day to 00:00 on the day
after its last day. From `$ARGUMENTS`, else the config's `period`:

- `last-week`: the most recent full Monday to Sunday before today. On a Monday that is the week that just ended;
  on a Wednesday it is still the week before.
- `7d`: the 7 days before today, today not included.
- `A..B`: from date A to date B, both included.

Say the period in one line with its real dates ("Monday 19 October to Sunday 25 October").

Done when: the period has a start and an end, each a date at 00:00.

## 3. Gather

Run `git fetch --tags --quiet` and read `origin/<main branch>`. Unpushed local commits are not shipped: leave them
out, and say so if there are any. Pass times every time: `--since="<start> 00:00" --until="<day after end> 00:00"`.
A bare date starts at the current time of day and misses work. Read only:

- **What reached the main branch**, by how the repo merges (the config's `merges`):
  - merge commits: `git log origin/<main> --first-parent --merges --since=... --until=...`;
  - squash merges: `gh pr list --state merged --search "merged:<start>..<end>" --json title,mergedAt,url`. Its
    dates are UTC: search a day wider on each side, then keep what `mergedAt` puts in the period;
  - direct commits (no pull requests): `git log origin/<main> --first-parent --no-merges --since=... --until=...`.
    Each commit is a source.
- **Release tags** in the period, if the repo has them: how many releases, the first and last version. Merged is
  not released: keep the two apart.
- **The changelog**, if the repo has one (the config's `changelog`): entries by their own date in the period.
- **Closed tickets** in the period, if the config names a ticket tool.
- **What is open:** open pull requests with commits in the period, and the plans or roadmap the config names.

Done when: you have every change that reached the main branch in the period, with what it was for, or you can say
the period had none.

## 4. Compare with last week's plan

Read the newest note in the log (the config's `log`). For each item in its "This week" list, mark it **done**,
**partly done**, **not started**, or **can't tell from this repo** (work outside the code: a deal, a hire, a
meeting). Not-started items carry over into the new plan. First run: skip this step and say so.

Done when: every item of last week's plan has a mark, or this is the first note.

## 5. Draft

Write the note in the shape the config's `shape` points to (a team's own format, with its headings and numbering),
else in the shape of [references/note-shape.md](references/note-shape.md):

- A title, and one or two sentences of context: a big or a slow week and why, the biggest piece still in progress.
  The reason a week was slow is often not in git. With the person there, ask for it; in a scheduled run, write
  `<context: add what the repo cannot show>` for them to fill in.
- **Last week:** 5 to 8 lines, one per topic. Name the feature in words the whole team knows; fold many small
  changes into one line. Leave out file names, pull request numbers, plan numbers and how it was built. Work still
  open goes in as one line that starts "In progress:", only when it had commits in the period.
- **This week:** carried-over items, then next steps from open work, marked as a suggestion the person edits.

Every line must be true to what you gathered: a line you cannot point to a merge, commit, tag, changelog entry,
ticket or open pull request in step 3 does not go in.

Done when: the draft is written, and each line traces to something in step 3.

## 6. Show and stop

Write the draft to the config's `draft` file (outside the repo by default). Reply with:

- The whole note in one code block, ready to copy.
- What you used: the period, how many pull requests or commits, releases and tickets.
- Last week's plan against what happened, one line each.
- Anything you were unsure of. Say so; do not guess.
- "After you send it, paste the final text here and I will save it, so next week's note can compare."

Then **stop**. Change nothing in the repo, post nothing, and leave the clipboard alone.

Done when: the person has the note.

## 7. Save what was sent (only when pasted back)

When the person pastes back the text they sent, follow the config's `save` when it says how (a team's own log
format or commit rules). Else save it exactly as sent: to `<log>/<YYYY-MM-DD>.md` (the date the
period ended) when `log` is a folder, or at the top of the file when `log` is one file. If the log is in the repo,
commit only that file, following the repo's rules for commits; never other changes.

Done when: the sent note is in the log.
