# Local checks (git hooks and the gate)

Inputs: `checks.txt` (repo-checks.js) and the Gate section of `metrics.txt` (from the transcripts: every `git push`
an agent ran, and every gate command in the config). People's own pushes outside Claude Code are not in the
transcripts; say so under "Not checked".

## Reliability

1. **Hooks installed:** `git rev-parse --git-path hooks` is where git looks. A hook manager (husky, lefthook,
   pre-commit, simple-git-hooks) or a tracked hooks folder that git does not point at runs nothing. A hook file
   that is not executable is skipped without a word. Each worktree shares the main checkout's hooks setting.
2. **Old hooks in old worktrees** (`worktrees:` in checks.txt): a tracked hooks folder and `.claude/settings.json`
   are read from each worktree's own branch, so a branch cut weeks ago runs the hooks of weeks ago, and safety hooks
   added since are missing there. Name the worktrees and what ran in them without a hook it would now meet. The fix
   is a hook that calls the main branch's copy (through `git rev-parse --git-common-dir`), or a rule to merge the main
   branch into long-lived branches.
3. **Hooks match CI:** `in_ci_not_hooks` lets a push go out that CI then fails (slow feedback); `in_hooks_not_ci`
   is a check nothing enforces on the main branch. Either can be on purpose (a slow suite only in CI, a docs check
   only locally); say which, from the hook's and the workflow's own comments.
4. **Failed pushes** (`push_failed`): read each tail. Sort them:
   - **Real catch:** the gate stopped a bug, type error, lint error or failing test. Working as intended.
   - **Waste:** a failure that protected nothing (stale dependencies, a check that cannot matter on that push, two
     sessions pushing the same branch, a flaky test), or a push re-run only to read an error a pipe cut off.
5. **Bypasses:** `--no-verify` (`no_verify`) and a push piped into `tail` or `grep` (`piped_push_attempts`), which
   hides a failed gate unless the shell has `pipefail`. Count those that ran, not those a hook refused (a call
   tagged both `piped_push` and `hook_refused` never ran).
6. **Hook refusals** (agent hooks in `.claude/settings.json`): from "hook refusals" in `metrics.txt`. Each is either
   the hook doing its job (an agent tried something it should not) or a false refusal (time lost, the agent worked
   around it). Read a few of each kind before saying which.

## Speed

1. **Push time** (`push_median_s`, `push_p90_s`, `push_max_s`): the hook runs inside the push, so this is the gate's
   wall time as agents feel it. Compare with the trend.
2. **Gate commands** (`gate_median_s`, p90, max) and the single checks (`typecheck`, `lint`, `test`).
3. **Contention:** a push or gate run while a native build, a dev server start or another session's gate ran
   (overlapping long calls in `calls.json`). Report the median with and without overlap.
4. **The slowest step:** if the hook prints step times, read them from push results; if not, a fix that makes it
   print them is worth proposing. Allowed: time the gate's commands once each yourself, when the machine is quiet
   (`uptime` load under the core count, no build running). Otherwise skip and say so.
5. **Skippable work:** a tag-only or branch-delete push that runs the full gate, a docs-only push that runs the
   test suite (ci.txt counts the pushes that changed only paths CI ignores), or a push right after the same checks
   passed by hand on the same tree.
6. **One after another:** lint and typecheck each use about one core, and a test runner set to half the cores leaves
   the rest free. When the hook runs them in a row, propose running them beside the tests, so the push takes as long
   as its slowest step. The failing step must still be named on the last line.
7. **What lint spends its time on:** when lint is a top step, profile it once (`TIMING=20 npx eslint <src> --no-cache`).
   One or two rules are often most of it. A rule the typechecker already enforces can go (in TypeScript:
   `import/namespace`, `import/named`, `import/default`); a rule that catches real bugs stays, however slow.
8. **A faster tool shipped:** when a check is a top step, look for a faster successor or major version (TypeScript 7,
   Oxlint or Biome for ESLint, Vitest with `isolate: false` for a suite that reloads the app per file). Time it on
   this repo, cold and warm, before proposing it: a warm incremental cache often already beats it.
   A formatter counts too: Prettier in a hook or a CI format check has faster successors (`bun fmt`, Biome,
   dprint). Time a check of the whole repo and of the staged files only: a hook that formats only staged files is
   often already fast. A new formatter can change the layout of many files, so the switch needs one formatting
   commit on its own (add it to `.git-blame-ignore-revs`) and a check that the output matches the team's style.
   Do not propose a different hook manager (hk, Lefthook, prek, pre-commit, husky) for speed: on about 60 staged
   files they differ by 1 to 2 s in all, while the checks they run take far longer. Make the checks faster instead.
9. **Every test on every push** (`tests in the gate:` in checks.txt says `every test on every push`): a branch push
   can run only the tests its change reaches, while the main branch keeps the full run. The test runner finds them
   from the import graph: Jest `--changedSince=origin/main`, Vitest `--changed origin/main` (or `vitest related`),
   pytest with `pytest-testmon`, Nx `affected`, Turborepo `--filter=...[origin/main]`. With no such tool (Go, Rust,
   Swift, a plain runner), map changed files to their packages or test targets and run those. Propose it only with
   these rules, or it hides failures:
   - a change to an input the import graph cannot see runs everything: the lockfile, the runner's or compiler's
     config, shared test helpers and mocks, a deleted or moved file, and code generated at build or test time (an
     API client made from a spec: the spec changes, but no test imports the spec). A generated file that is
     committed and imported like any other file is in the graph and needs no rule;
   - a test that reads source files from disk (a file scan, a snapshot of the tree) always runs, since no import
     links it to the file it reads;
   - a per-file coverage bar is checked on the changed files only, so a new file with no test still fails at 0%;
     keep only changed files a threshold rule covers, or a change outside every threshold glob fails with "coverage
     data was not found";
   - inside a git hook, git sets `GIT_DIR`; a runner that calls git from a subfolder (Jest's `--changedSince` runs
     `git diff` from each root) then fails with "outside repository" in a worktree. Clear the hook's `GIT_*`
     variables before starting the runner, and prove it with a real push from a worktree that does not force a
     full run (a push that changes the lockfile skips this code and hides the bug);
   - the main branch, the pre-release gate and CI on the main branch always run every test.
   Before trusting a selector, backtest it: take a past bug, check out the commit before its fix, feed that change to
   the selector, and check that it picks the test that fails. Run a new shortcut in shadow mode first (run every
   test, record what the selector would have skipped, count the misses). Keep a switch that turns selection off
   (an environment variable such as `TEST_SCOPE=full`), and make the selection explain itself (why each test was
   picked: owner, importer, policy). A missing or unclear dependency widens the run; it never skips a test.
   Time it on a probe branch before proposing. Full runs still happen on every lockfile bump, so keep the full run
   fast too: on CI, shards balanced by recorded test time (CI speed item 10) keep a full run to a few minutes.
10. **One test file holds the whole run:** a test runner spreads files across workers but cannot split a file. When
   the slowest file takes most of the test step (Jest `--json` gives each file's start and end; pytest
   `--durations`; `go test -json` per package), splitting it into several files on a shared helper lets the other
   workers help.
11. **Test suite growth** (`test_growth` in checks.txt): test files and lines now and at the start of the week, and
   their share of test plus code lines. An agent writes tests easily and seldom deletes one, so a suite can grow
   much faster than the code it protects, and every test costs run time and upkeep. When tests grow faster than
   code week after week, propose two things:
   - a test budget: a check that fails a change adding more than a set number of test lines, unless it deletes or
     merges tests elsewhere or records why it needs more (one large project allowed 400 net new test lines a change
     without a record);
   - a clean-up, one area at a time: read the code first, name the behaviour each test protects and a real bug that
     would make it fail, keep the strongest test for each behaviour, and delete tests that restate the code, repeat
     another test, or pass when the behaviour is broken. Break the code on purpose to prove the kept test still
     fails. Never delete the only test of a behaviour, and never sort by run time and delete the slowest.
   Report the trend, not a target: a share can fall because the code grew.
