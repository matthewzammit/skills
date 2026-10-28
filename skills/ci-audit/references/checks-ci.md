# CI checks (GitHub Actions)

Inputs: `ci.txt` / `ci.json` (ci-runs.js) and `checks.txt` (repo-checks.js). Every finding names its run ids or
file lines, says **measured** or **estimated**, and gives minutes lost per week. People-minutes (someone waited or
re-ran) rank above runner-minutes (only money).

## Reliability

1. **No CI at all:** `NO CI` in ci.txt (no workflow that checks code ran on the main branch), or a workflow file
   under `NOT ON origin/<branch>` in checks.txt (committed but never pushed, so GitHub has never run it). Either
   means every push is unchecked; it outranks everything else.
2. **Holes** (top priority, always fix): a push to the main branch that changed files CI watches and never got a
   passing run (`holes` in ci.json, `hole: true`). Say what reached the branch unchecked and for how long. A cancelled
   run covered by the next push within the hour is not a hole.
3. **Skipped by the workflow's own condition** (`status: skipped`): read the job's `if:`. Fine when it only skips
   commits that need no check (a version stamp right after a checked merge); a hole when it can skip real code.
4. **Failures:** for each failed run, the cause from `gh run view <id> --log-failed` (the failed step is in
   ci.json). Sort them: a real catch (the code was wrong: working as intended), a flaky test, an environment problem
   (runner, network, cache, a service down), or a broken workflow. Only the last three are waste.
5. **Flakes:** a run that went green on a re-run, or a failed run whose commit later passed in the same workflow
   (`flakes`). Name the test or step when the log shows it.
6. **Cancelled runs:** superseded by a newer push on the same branch is by design; anything else needs a cause.
   Their billed minutes are waste.
7. **Failures that cannot block** (`checks.txt`): `continue-on-error: true`, `|| true` or `set +e` in a check's run
   line, a summary job with `if: always()` that never reads `needs.*.result` (it passes when the matrix fails).
   Each is a hole waiting to happen when the check is a required one.
8. **No `timeout-minutes`** on a job: a hung job runs for 6 hours. Suggest twice the longest run of that job
   (`long_jobs`, or the job's `max_s` in `speed`).
9. **Billing:** month-to-date use when the account allows it:
   `gh api /users/<user>/settings/billing/usage` or `/organizations/<org>/settings/billing/usage` (needs admin;
   "not checked" otherwise). Flag a pace over the plan's free minutes, or any run blocked by billing.

## Speed

1. **The longest job chain** (`longest_chain` per workflow): the jobs a run waits on one after another. A speed-up
   counts only on that chain; a faster job beside it saves runner-minutes, not wall time.
2. **Run time from successful runs only:** median and p90 wall (`run_median_s`, `run_p90_s`), and per job and step
   (`speed`). Compare with last week's trend row. Name the slowest steps and whether they grew (a test step grows
   with the test count; say how many tests).
3. **Queue wait** (`queue_median_s`): over a minute means runners are short (self-hosted, concurrency limits, or a
   busy org).
4. **Billed minutes** (`billed_min`, estimated): each job is rounded up to a whole minute, times 2 on Windows and
   10 on macOS. A job just over a minute bills 2: show how many runs sit just over a boundary and what would bring
   them under. `billed_wasted_min` is failed and cancelled runs.
5. **Path filters** (`path_filter_use`): a workflow with a path filter that still ran on 80% or more of pushes filters
   almost nothing. Missing filters: a docs-only push that ran the full suite.
6. **Cache:** a warm run that took as long as a cold one (dependency install or lint step at its cold time) means
   a cache was missed or rejected; look at the step's log for the restore line.

## Already right

List what you checked and found fine (0 holes, 0 flakes, timeouts set, filters working). The report keeps it, so a
later week can see what changed.
