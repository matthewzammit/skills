# Setup

Once per repo, per person (transcripts live on each person's machine, so the config does too).

## 1. Look

Find out, without asking:

- **The repo and main branch:** `gh repo view --json nameWithOwner,defaultBranchRef,visibility`. Public repos pay
  nothing for standard runners; say so later instead of counting money.
- **CI:** `.github/workflows/*.yml`, and which workflows ran on pushes to the main branch last week
  (`node ${CLAUDE_SKILL_DIR}/scripts/ci-runs.js --days 7 --no-jobs --out $OUT/ci.json`). The ones that check code
  are CI; announce, release and deploy workflows are not.
- **Hooks:** `node ${CLAUDE_SKILL_DIR}/scripts/repo-checks.js`.
- **The gate commands** people and agents run before a push: `package.json` scripts such as `validate`, `check`,
  `verify`, `precommit`, a `Makefile` target, or what the pre-push hook runs.
- **Transcripts:** `ls ~/.claude/projects | grep <repo folder name>`. Claude Code names each folder after the
  working directory, so each worktree has its own. Note the text they share (usually the repo's folder name).
- **Add-ons:** **mobile** when the repo builds an iOS or Android app (an `ios/` or `android/` folder, `app.json`
  for Expo, `pubspec.yaml`, an `.xcodeproj`); **web** when it runs a dev server or browser tests (`next`, `vite`,
  `nuxt`, `astro`, `remix`, Playwright or Cypress config). A repo can have both.
- **Repo helpers** that agents use to drive the app: scripts named like `sim`, `shot`, `screenshot`, `reload`,
  `qa`, `e2e`, `dev`. Grep the last week's commands for them: `node ${CLAUDE_SKILL_DIR}/scripts/transcripts.js --days 7 --out $OUT/calls.json`
  then the "top command shapes" in `metrics.js`.

Say in two lines what you found ("A Next.js app, CI is one workflow `test.yml`, a husky pre-commit runs lint-staged,
41 Claude Code sessions last week across 3 worktrees").

## 2. Ask

Ask only what is left, with the question tool if you have one (at most 4 questions), each with your
recommendation first:

1. **Where records go:** `.dev-loop-audit/` in the repo, git-ignored (recommended: it stays beside the code), or
   `~/.claude/dev-loop-audit/<repo>/`, where `<repo>` is the repo's name on GitHub (outside the repo: nothing to ignore,
   and a scheduled run never dirties the checkout).
2. **Tickets:** does the team track work in a tool (GitHub Issues, Linear, Jira, ClickUp)? If so, how you file to
   it: a CLI (`gh issue create`, `linear`), an API script the repo already has, or the person files from your list.
3. **The weekly run:** schedule it now (recommended), later, or never. See [../templates/weekly-routine.md](../templates/weekly-routine.md).
4. Only if unclear from step 1: which workflows count as CI, or which commands are the gate.

Done when: every question is answered.

## 3. Write the config

`<records>/config.json`. With records in `.dev-loop-audit/`, add `.dev-loop-audit/` to `.gitignore` (on a branch with a pull
request, like any change). Keys:

```json
{
  "repo": "owner/name",
  "mainBranch": "main",
  "records": ".dev-loop-audit",
  "addons": ["web"],
  "transcripts": { "match": ["my-app"] },
  "ci": { "workflows": ["CI"] },
  "gate": { "commands": ["npm run (-s )?validate\\b"] },
  "screenReads": "\\.(png|jpe?g)$",
  "tags": [
    { "pattern": "npm run (-s )?shot\\b", "tags": ["screenshot"] },
    { "pattern": "npm run (-s )?dev:up\\b", "tags": ["helper", "helper_start"] }
  ],
  "tickets": { "tool": "github", "how": "gh issue create --label dev-loop-audit" },
  "routine": "weekly, Monday 09:00, this computer"
}
```

- `transcripts.match`: texts that the `~/.claude/projects` folder names contain. Without it the script takes the
  folders of the repo's current worktrees, which misses worktrees already deleted.
- `ci.workflows`: workflow names (as GitHub shows them) that check code. Without it the script guesses.
- `gate.commands`: regexes for the gate commands, so their times are measured.
- `screenReads`: which image reads count as the agent looking at the app (default: any png or jpg). Narrow it when
  agents also read design images or other pictures.
- `tags`: the repo's own helpers, as regexes over Bash commands, with the tags they add. The tags the metrics use:
  `screenshot` (takes a picture of the app), `screen_seen` (the agent sees the app), `input` (taps or clicks it),
  `helper` (a repo script for checking), `helper_start` (a helper that starts something: counts setup as cold),
  `qa` (any other call that belongs to checking the app). Any other tag is counted under its own name.

Run the four commands from SKILL.md step 3 once and read `metrics.txt`: the sessions, inputs and gate numbers should look right
for the repo. Fix the config until they do.

Done when: the four scripts run clean with the config, and the person has seen the first numbers.

## 4. The weekly run

If the person chose it, schedule it from [../templates/weekly-routine.md](../templates/weekly-routine.md).
