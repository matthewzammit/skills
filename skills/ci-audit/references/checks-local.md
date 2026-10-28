# Local checks (git hooks and the gate)

Inputs: `checks.txt` (repo-checks.js) and the Gate section of `metrics.txt` (from the transcripts: every `git push`
an agent ran, and every gate command in the config). People's own pushes outside Claude Code are not in the
transcripts; say so under "Not checked".

## Reliability

1. **Hooks installed:** `git rev-parse --git-path hooks` is where git looks. A hook manager (husky, lefthook,
   pre-commit, simple-git-hooks) or a tracked hooks folder that git does not point at runs nothing. A hook file
   that is not executable is skipped without a word. Each worktree shares the main checkout's hooks setting.
2. **Hooks match CI:** `in_ci_not_hooks` lets a push go out that CI then fails (slow feedback); `in_hooks_not_ci`
   is a check nothing enforces on the main branch. Either can be on purpose (a slow suite only in CI, a docs check
   only locally); say which, from the hook's and the workflow's own comments.
3. **Failed pushes** (`push_failed`): read each tail. Sort them:
   - **Real catch:** the gate stopped a bug, type error, lint error or failing test. Working as intended.
   - **Waste:** a failure that protected nothing (stale dependencies, a check that cannot matter on that push, two
     sessions pushing the same branch, a flaky test), or a push re-run only to read an error a pipe cut off.
4. **Bypasses:** `--no-verify` (`no_verify`) and a push piped into `tail` or `grep` (`piped_push_attempts`), which
   hides a failed gate unless the shell has `pipefail`. Count those that ran, not those a hook refused.
5. **Hook refusals** (agent hooks in `.claude/settings.json`): from "hook refusals" in `metrics.txt`. Each is either
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
5. **Skippable work:** a tag-only or branch-delete push that runs the full gate, or a docs-only push that runs the
   test suite.
