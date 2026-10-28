# Setup

Once per repo.

## 1. Look

Find out, without asking:

- **The main branch:** `gh repo view --json defaultBranchRef`, or `git symbolic-ref refs/remotes/origin/HEAD`.
- **How work reaches the main branch:** merge commits (`git log --first-parent --merges` finds them), squash
  merges (it finds none; use `gh`), or direct commits with no pull requests.
- **Release tags:** `git tag --sort=-creatordate | head`. Note the pattern (`v1.2.3`, `release-*`).
- **A changelog:** `CHANGELOG.md`, `changelog.json`, release notes in `docs/`.
- **Plans or a roadmap:** a `plans/` or `roadmap` file the team keeps open work in.
- **A ticket tool:** a CLI or script the repo uses (`gh issue`, `linear`, Jira).
- **An existing note or routine:** a file of past notes (`docs/*progress*`, `*weekly*`), or a scheduled task
  that already drafts one. Use its log and its shape rather than starting a second one.

Say in two lines what you found ("Squash merges, tags `v*`, a CHANGELOG.md, GitHub Issues; no plans folder").

## 2. Ask

Ask only what is left, with the question tool if you have one, each with your recommendation first:

1. **The default period:** last week, Monday to Sunday (recommended for a weekly note), or the last 7 days.
   Any run can still ask for other dates.
2. **Where the log of sent notes goes:** `.progress-notes/` in the repo (recommended: the team sees the history),
   or `~/.claude/progress-notes/<repo>/` (only on this computer). Next week's note compares with the last one.
3. **Tickets:** git only (recommended: a ticket closed with no code behind it is rarely news), or closed tickets
   too (show how), when the team tracks work that never touches the repo.
4. **The weekly run:** schedule it for Monday morning (recommended), or run it by hand.

## 3. Write the config

`.progress-notes/config.json` in the repo, or `~/.claude/progress-notes/<repo>/config.json`, wherever the log is:

```json
{
  "mainBranch": "main",
  "period": "last-week",
  "log": ".progress-notes",
  "draft": "~/.claude/progress-notes/<repo>/draft.md",
  "merges": "squash",
  "logIsFile": false,
  "tags": "v*",
  "changelog": "CHANGELOG.md",
  "plans": "docs/roadmap.md",
  "tickets": { "tool": "github", "how": "gh issue list --state closed --search \"closed:<start>..<end>\"" },
  "audience": "the whole team, not only engineers",
  "shape": null,
  "save": null,
  "routine": "weekly, Monday 09:00, this computer"
}
```

`log` is a folder (one file per note) or, with `logIsFile`, one file with the newest note on top. Leave out a key
the repo has no source for. `audience` sets the words: for a founder or a client, even plainer. `shape` and `save` point to a team's own
format and logging steps when they have one (`docs/weekly.md#Shape of the note`); `null` uses this skill's.

## 4. The weekly run

If the person chose it, schedule it from [../templates/weekly-routine.md](../templates/weekly-routine.md).

Done when: the config exists, and the routine is scheduled if the person asked.
