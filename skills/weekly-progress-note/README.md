<p align="center">
  <img src="../../assets/weekly-progress-note.png" alt="Weekly progress note: merged pull requests, releases and closed tickets on the left, your agent in the middle, and on the right a short note with what shipped last week and a suggested plan for this week." width="100%">
</p>

# Weekly progress note

**Drafts a short weekly note in plain words: what shipped last week, and what is next.**

A founder, a PM or a client wants to know what happened this week. The changelog has every change, but nobody
reads it, and nobody has time to write the short version. This skill reads what was merged and released, and
drafts a note anyone on the team understands. You read it, change what you like, and send it yourself.

## Install

```bash
npx skills add matthewzammit/skills --skill weekly-progress-note
```

It works in Claude Code, Cursor, Codex and other agents. It asks where to install: this project only, or global
(every project on your computer). Run it again to update.

Or as a Claude Code plugin, which installs all the skills in this repo:

```
/plugin marketplace add matthewzammit/skills
/plugin install matthewzammit-skills@matthewzammit
```

## Run it

| You type | What it covers |
|---|---|
| `/weekly-progress-note setup` | Once per repo: the default period, where sent notes are kept, and the Monday routine. |
| `/weekly-progress-note` | The default period (last week, Monday to Sunday, unless you changed it). |
| `/weekly-progress-note 7d` | The last 7 days. |
| `/weekly-progress-note 2026-10-01..2026-10-14` | Any two dates. |

When installed as a Claude Code plugin, the command is `/matthewzammit-skills:weekly-progress-note`. It also
starts when you ask for "a progress note for last week" or "what did we ship".

## What you get

```
Weekly progress, 19 to 25 October
A big week for payments: card payments shipped, and the invoice redesign is half done.

Last week
- Card payments: customers can pay an invoice by card, with receipts by email
- Invoices list: search by customer name, and filters for paid and overdue
- Settings polish: clearer labels, and every page works at the largest text size
- Two releases (1.4.0 and 1.4.1), the second fixing a crash on older phones

This week (suggested)
- Carried over: the invoice redesign (the list is done, the detail page is next)
- Partial refunds from the invoice page
```

With it: what it read (how many pull requests and releases), last week's plan against what happened, and anything
it was not sure of.

## How it works

- **It reads, never writes:** merged pull requests, release tags, the changelog and closed tickets, if you have
  them. Only git is required.
- **Every line is true:** each "last week" line comes from something merged, released or closed in the period.
- **It checks last week's plan:** done, partly done, or not started. What did not start carries over.
- **It never posts.** You send the note. Paste back what you sent, and it keeps it, so next week's note can
  compare.

## The weekly run

Schedule it for Monday morning in the Claude desktop app (Code tab, Scheduled). The prompt and the steps are in
[templates/weekly-routine.md](templates/weekly-routine.md).

## Credits

Built from the weekly note we draft for the team on the [Binderr](https://binderr.com) Wallet app.
