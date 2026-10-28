---
name: weekly-progress-note
description: Drafts a short weekly progress note in plain words for a founder, PM or team - what shipped last week (5 to 8 lines naming features, never files or PR numbers) and a suggested plan for this week, checked against last week's plan - from merged pull requests, release tags, the changelog and closed tickets. Works for last week, the last 7 days or any two dates, on demand or as a Monday routine. Never posts. Use when someone asks for a weekly update, a progress note or summary, a "what did we ship" note, or wants one drafted every week.
argument-hint: "[setup | last-week | 7d | YYYY-MM-DD..YYYY-MM-DD]"
---

# Weekly progress note

Draft a short note that tells the team what shipped and what is next, in words anyone on the team understands.
**It is not a release log**: the changelog lists every change; this note names the few big topics. You draft it
and show it. **The person sends it.** You never post it anywhere.

## 1. Setup (first run, or `setup`)

If the repo has no config (`.progress-notes/config.json`, or `~/.claude/progress-notes/<repo>/config.json`), or
`$ARGUMENTS` is `setup`, follow [references/setup.md](references/setup.md): the default period, where the log of
sent notes lives, which sources exist, and whether to schedule it. Stop there if the argument was `setup`.

Done when: a config exists.

## 2. Period

Run `date` first. From `$ARGUMENTS`, else the config's `period`:

- `last-week`: last Monday 00:00 to this Monday 00:00, local time. On a Monday, that is the week that just ended.
- `7d`: the 7 days up to now.
- `A..B`: from date A to date B, both included.

Say the period in one line with its real dates ("Monday 19 October to Sunday 25 October").

Done when: the period has two real dates.

## 3. Gather

Run `git fetch --tags --quiet` and read `origin/<main branch>`, never a local branch that may be behind. Read only:

- **Merged pull requests** in the period: `git log origin/<main> --merges --since=<start> --until=<end>`, or
  `gh pr list --state merged --search "merged:<start>..<end>"`. Repos that squash have no merge commits: use
  `gh`, or `git log --first-parent`.
- **Release tags** in the period, if the repo has them: how many releases, the first and last version.
- **The changelog**, if the repo has one (the config's `changelog`): entries dated in the period.
- **Closed tickets** in the period, if the config names a ticket tool.
- **What is open:** open pull requests and any plans or roadmap file the config names.

Done when: you have every merged pull request in the period, with what it was for.

## 4. Compare with last week's plan

Read the newest note in the log (the config's `log`). For each item in its "This week" list, mark it done, partly
done or not started, from what you gathered. Not-started items carry over into the new plan. First run: skip this
step and say so.

Done when: every item of last week's plan has a mark, or this is the first note.

## 5. Draft

Write the note in the shape of [references/note-shape.md](references/note-shape.md):

- A title, and one or two sentences of context: a big or a slow week and why, the biggest piece still in progress.
- **Last week:** 5 to 8 lines, one per topic. Name the feature in words the whole team knows; fold many small
  pull requests into one line. Leave out file names, pull request numbers, plan numbers and how it was built.
- **This week:** carried-over items, then next steps from open work, marked as a suggestion the person edits.

Every line must be true to what you gathered: a line you cannot point to a pull request, tag, changelog entry or
ticket for does not go in.

Done when: the draft is written, and each "Last week" line traces to something in step 3.

## 6. Show and stop

Write the draft to the config's `draft` file (outside the repo by default). Reply with:

- The whole note in one code block, ready to copy.
- What you used: the period, how many pull requests, releases and tickets.
- Last week's plan against what happened: done, partly done, not started, one line each.
- Anything you were unsure of. Say so; do not guess.
- "After you send it, paste the final text here and I will save it, so next week's note can compare."

Then **stop**. Change nothing in the repo, post nothing, and leave the clipboard alone.

Done when: the person has the note.

## 7. Save what was sent (only when pasted back)

When the person pastes back the text they sent, save it to the log as `<log>/<YYYY-MM-DD>.md` (the date the
period ended), exactly as sent. If the log is in the repo, commit only that file, following the repo's rules for
commits; never other changes.

Done when: the sent note is in the log.
