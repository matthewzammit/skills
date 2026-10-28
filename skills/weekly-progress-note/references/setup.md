# Setup

Once per repo.

## 1. Look

Find out, without asking:

- **The main branch:** `gh repo view --json defaultBranchRef`, or `git symbolic-ref refs/remotes/origin/HEAD`.
- **How pull requests merge:** merge commits (`git log --merges` finds them) or squash (it does not; use `gh`).
- **Release tags:** `git tag --sort=-creatordate | head`. Note the pattern (`v1.2.3`, `release-*`).
- **A changelog:** `CHANGELOG.md`, `changelog.json`, release notes in `docs/`.
- **Plans or a roadmap:** a `plans/` or `roadmap` file the team keeps open work in.
- **A ticket tool:** a CLI or script the repo uses (`gh issue`, `linear`, Jira, ClickUp).

Say in two lines what you found ("Squash merges, tags `v*`, a CHANGELOG.md, GitHub Issues; no plans folder").

## 2. Ask

Ask only what is left, with the question tool if you have one, each with your recommendation first:

1. **The default period:** last week, Monday to Sunday (recommended for a weekly note), or the last 7 days.
   Any run can still ask for other dates.
2. **Where the log of sent notes goes:** `.progress-notes/` in the repo (recommended: the team sees the history),
   or `~/.claude/progress-notes/<repo>/` (only on this computer). Next week's note compares with the last one.
3. **Tickets:** read closed tickets too (show how), or git only.
4. **The weekly run:** schedule it for Monday morning (recommended), or run it by hand.

## 3. Write the config

`<log>/config.json`:

```json
{
  "mainBranch": "main",
  "period": "last-week",
  "log": ".progress-notes",
  "draft": "~/.claude/progress-notes/<repo>/draft.md",
  "merges": "squash",
  "tags": "v*",
  "changelog": "CHANGELOG.md",
  "plans": "docs/roadmap.md",
  "tickets": { "tool": "github", "how": "gh issue list --state closed --search \"closed:<start>..<end>\"" },
  "audience": "the whole team, not only engineers",
  "routine": "weekly, Monday 09:00, this computer"
}
```

Leave out a key the repo has no source for. `audience` sets the words: for a founder or a client, even plainer.

## 4. The weekly run

If the person chose it, schedule it from [../templates/weekly-routine.md](../templates/weekly-routine.md).

Done when: the config exists, and the routine is scheduled if the person asked.
