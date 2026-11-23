# Setup

Once per repo. It writes the config that says how this team ships, so every brief can be filled from it.

## 1. Look

Find out, without asking:

- **The repo's name on GitHub** (`git remote get-url origin`) and its main branch.
- **The stack**: mobile (an `ios/` or `android/` folder, `app.json`, `pubspec.yaml`), web (`next`, `vite`, a
  `public/` folder), backend (a server entry point, migrations, an OpenAPI spec). Read
  [stacks.md](stacks.md) for the section that fits.
- **The rules for changes**: `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, the PR template, the hooks. Branch names,
  commit format and trailers, version bumps, changelog rules, plan files, docs checks.
- **The checks**: the scripts that type-check, lint and test, the fastest one that picks checks from a diff (a
  `verify` script or skill), and the full gate (often a pre-push hook or CI).
- **Decision records**: a plans folder, ADRs (`docs/adr/`), an archive of finished plans. Surveys grep them before
  calling something a gap.
- **Docs worth knowing**: the files that state the repo's principles (architecture, style, a QUALITY.md), the code
  that is generated (API clients, schema output), and internal or lab screens.
- **Error reporting**: where a caught error should end up (a crash reporter, a logger helper).
- **Version**: the file that holds the app's version, if a commit bumps it.
- **Tickets**: a tracker the repo already talks to (a CLI, an API script, `gh issue`).
- **Running the app**: how to start it, which device or browser, how an agent taps, types and takes a screenshot
  there, which themes the app ships, any helper scripts, and whether a shared simulator or device needs a lock.
- **Merging**: a merge skill or script that reconciles version files, the changelog or a plans index.
- **Standing rules**: corrections the person has repeated, in memory or notes. They become the house rules file.

Say in two or three lines what you found.

## 2. Ask

Ask only what is left, one message, each with your pick first:

1. **Records**: the run folder in the repo (pick: `docs/process/code-quality-review/`, committed at checkpoints, so
   nothing lives only in a home or temp folder) or another path.
2. **Tickets**: the tool and the exact commands to create one and to move one; whether each run gets its own epic or
   parent ticket; anything a ticket must carry.
3. **Models**: which model surveys, builds, reviews and checks the app. Pick: the strongest model plans, surveys and
   reviews risky diffs; a cheaper one builds and reviews the rest.
4. **The app**: the device or browser to check on, how to take a shared one (a lock), what never to use, the test
   account, the data on it that must never be deleted, and which checks only the person or a real device can do.

## 3. Write the house rules file

From [../templates/house-rules.md](../templates/house-rules.md), in the records folder unless the repo has one. Fill
it from the config and the person's standing rules (section 5 of the template): what the test accounts may do,
what is owed to the person, deletions, the device lock. Show it and change it until the person approves it.

## 4. Write the config

`~/.claude/code-quality-review/<repo>/config.json`. Free-text values are in the person's words and followed as
written. Leave out a key the repo has no use for; the skill then uses its default.

```json
{
  "repo": "owner/name",
  "mainBranch": "main",
  "stack": "React Native (Expo) mobile app",
  "records": "docs/process/code-quality-review",
  "houseRules": "docs/process/code-quality-review/house-rules.md",
  "branch": "feat/code-quality-NN",
  "worktrees": "sibling folders of the repo, one per builder",
  "tickets": {
    "tool": "GitHub Issues",
    "create": "gh issue create --title \"<Area>: <what>\" --body-file <file> --label code-quality",
    "move": "gh issue comment <id> --body \"<text>\"",
    "epic": "one parent issue per run, created at kickoff",
    "rules": "one ticket per fix unit and per big item"
  },
  "plans": {
    "folder": "plans/",
    "next": "how to get the next plan number",
    "index": "the file that lists active plans, if any",
    "decisions": ["plans/", "plans/_archive/", "docs/adr/"]
  },
  "commit": {
    "format": "message format, author and trailers",
    "changelogAndVersion": "how a commit bumps the version and adds a changelog entry, or \"none\"",
    "versionFile": "package.json"
  },
  "pr": "open one PR per unit against main with gh pr create; the body carries the review and check results",
  "checks": {
    "beforeCommit": "the scoped check command for a diff",
    "full": "the full gate, run after each merge batch",
    "deadCode": "npx knip"
  },
  "principleDocs": ["AGENTS.md", "docs/architecture.md"],
  "paths": { "generated": ["src/api/generated/"], "lab": ["src/screens/dev/"] },
  "errorReporting": "the crash reporter, through src/lib/log.ts",
  "models": {
    "survey": "strongest",
    "build": "cheaper",
    "review": "cheaper",
    "reviewRisky": "strongest",
    "riskyPaths": ["src/auth/", "src/session/", "src/data/", "deep links", "push payloads", "tokens", "observability"],
    "verify": "strongest"
  },
  "app": {
    "run": "how to start it",
    "device": "which simulator, emulator or browser",
    "lock": { "take": "command to take a shared device", "give": "command to hand it back" },
    "never": ["devices or accounts never to use"],
    "testAccount": "which account or demo mode",
    "protectedData": "data on the test accounts never to delete",
    "deviceOnly": "checks only the person or a real device can do (biometrics, a real push, an email link)",
    "driving": "how an agent taps, types, takes a screenshot and reads the screen",
    "themes": ["light", "dark"]
  },
  "loadGate": { "maxHeavyJobs": 2, "command": "a script that says yes or no, if the repo has one" },
  "merge": "the repo's merge steps (a skill or script), run by the lead after a yes",
  "never": ["things that always need the person's yes, beyond the skill's own list"]
}
```

Defaults when a key is missing: records in `docs/process/code-quality-review/`; branch `code-quality/<unit>`; no
tickets (the tracker lists the work); no plans (big items go in the tracker's big-item list); the strongest model
for surveys, risky reviews and app checks, the next one down for the rest; load gate at most 2 heavy jobs, checked
with the inline command in [build.md](build.md); no version bump or changelog entry.

The briefs in `templates/` read these keys by name: `{{models.riskyPaths}}` is the config's `models.riskyPaths`. A
brief line whose key the config leaves out uses the default above, or is dropped. Placeholders that are not config
keys (`{{date}}`, `{{worktree}}`, `{{findingsFile}}` and the like) are filled by the lead from the run.

Done when: the config exists, the house rules file is approved, and the app starts with `app.run`.
