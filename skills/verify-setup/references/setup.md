# Setup

## 1. Read the repo

Read these, do not ask for them:

- **Stack and package manager:** `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Gemfile`.
- **Existing checks:** the scripts for tests, lint, typecheck, build and end-to-end tests; the CI workflow files
  (the commands CI runs are the commands to use); any single "validate" or "check" script.
- **How to run the app:** a dev server script, a simulator build, a docker compose file, a README section.
- **Hook system:** `.husky/`, `lefthook.yml`, `.pre-commit-config.yaml`, or a plain folder and `git config
  core.hooksPath`. Run `git config core.hooksPath` and look in `.git/hooks/` for hooks that are not `.sample`.
- **How agents sign commits:** `git log -20 --format=%B`, to see the co-author trailer text.
- **Worktrees:** `git worktree list`. The marker and log live in the git common dir, so worktrees share them.

## 2. Ask the person

One message, short options with a default:

1. **Where does the config live?** Default: `.verify/config.json` in the repo (the team shares it). Or
   `~/.claude/verify-setup/<repo>/config.json`, for a repo you do not own.
2. **Which check is the full check?** Default: the single script that runs everything CI runs. It writes the
   marker. When none exists, offer to make one from the CI commands.
3. **What does "run the app and look" mean here?** Name the command and the tool: browser automation, a
   simulator, a local service call, the binary.
4. **Which paths need no checks?** Default: `**/*.md`, `docs/**`, `LICENSE`.
5. **Which trailer marks an agent commit?** Default: the co-author line you saw in the log.

## 3. Write the config

Start from [templates/config.json](../templates/config.json). Fill `checks` in order, cheapest first:

```json
{ "token": "lint", "command": "npm run lint", "paths": ["src/**"] }
```

- `token`: a short lowercase word that goes in the stamp.
- `command`: what to run. Use `manual: true` and a `description` for a step the agent does by looking, such as running the app and reading the changed screen. It is never a job for the person.
- `paths`: globs (`**`, `*`, `?`, `{a,b}`). A check runs when any changed file matches. `["**"]` is every change.

Show the person the map as a table (path, checks, tokens) and wait for a yes. Leave `mode` as `observe`.

## 4. Install

Copy these from this skill's `scripts/` to `.verify/` in the repo: `verify-lib.js`, `plan.js`, `stamp-check.js`,
`mark-pass.js`, `summary.js`. Do not copy the `*.test.js` files.

Copy [templates/verify-skill.md](../templates/verify-skill.md) to `.claude/skills/verify/SKILL.md` (for other
agents, the folder they read skills from). Change the lines in step 3 to name the real run command.

Make the full check end with `node .verify/mark-pass.js` and only on success (`npm run validate && node
.verify/mark-pass.js`). A check that writes the marker on a failure makes the stamp a lie.

Wire the hook, the way the repo already does hooks:

| System | Wiring |
|---|---|
| Plain folder | `.githooks/commit-msg`: `#!/bin/sh` then `node .verify/stamp-check.js "$1"`. Make it executable. Run `git config core.hooksPath .githooks`. |
| husky | `.husky/commit-msg`: `node .verify/stamp-check.js "$1"` |
| lefthook | In `lefthook.yml`: `commit-msg: commands: { verify-stamp: { run: node .verify/stamp-check.js {1} } }` |
| pre-commit | A local hook with `entry: node .verify/stamp-check.js`, `language: system`, `stages: [commit-msg]`, `pass_filenames: true`. Add `commit-msg` to `default_install_hook_types`. |

Keep the existing hooks. Add the new line, never replace one.

The marker, log and block counts live in the git common dir, not the work tree, so nothing extra is committed.

## 5. Modes

Set `mode` in the config, or `VERIFY_MODE` for one run:

- `off`: does nothing.
- `observe` (default): logs each commit and never blocks.
- `enforce`: blocks an agent commit with no stamp, or one that names the full check without a marker. After 2
  blocks in one session, the next commit passes, so an agent never gets stuck.

The person chooses `enforce`, after a clean week in `observe`.

## 6. Trial

Run the new verify skill on a small real change, commit with a stamp, and read the last line of
`verify-log.tsv` in the git common dir (`git rev-parse --git-common-dir`). Its status column says `ok`.
