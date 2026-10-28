# The report

One file per run, `<records>/<YYYY-MM-DD>.md` (the run's date), from [../templates/report.md](../templates/report.md).
The person reads the summary; the rest is evidence for a later week.

## Rules

- **Rank by minutes lost per week**, across all areas. A problem that costs people time ranks above one that costs
  only runner minutes.
- **Measured or estimated:** every number from a script or a command is measured; anything else says "estimated"
  and how (for example "27 min, estimated from two failed builds of ~13 min").
- **Evidence:** a run id, a file and line, or a session and tool_use id for each finding.
- **Already right** keeps what was checked and found fine. **Not checked** keeps what could not be checked and why
  (no billing access, no transcripts for people's own pushes, the machine too busy to time the gate).
- **Verified:** each of the top five says holds, downgraded or dropped (SKILL.md step 5).
- **Past fixes:** for each fix built after an earlier report, say whether it holds this week, from the numbers.
- **Plain words.** Short sentences. A recommendation with every choice.

## Trend columns

`metrics.js --append-trend` writes one row per window to `<records>/trend.csv`. A row for the same start date is
replaced, so a re-run does not double it. Empty means not measurable that week; never fill a guess.

| Column | Meaning |
|---|---|
| `week`, `days` | Window start (local date) and length |
| `ci_runs`, `ci_failed`, `ci_flaky`, `ci_holes` | All runs in the window; failed; flaky (workflow and commit); holes |
| `ci_run_median_s`, `ci_run_p90_s` | Wall time of successful CI runs |
| `ci_queue_median_s` | Job queue wait in successful CI runs |
| `ci_billed_min` | Estimated billed minutes, all workflows |
| `agent_sessions`, `agent_calls` | Main-thread sessions and tool calls |
| `agent_wall_min`, `agent_model_min` | Tool wall time (union) and model time between calls |
| `calls_over_60s_min` | Minutes in calls over 60 s |
| `sleep_only_calls`, `sleep_nominal_min` | Calls that only sleep; nominal sleep minutes in all calls |
| `retries`, `hook_refusals` | Same failed command run again; calls a hook refused |
| `push_median_s`, `push_p90_s`, `push_failed` | Agent `git push` times (the hook runs inside) and failures |
| `gate_median_s` | The config's gate commands run by hand |
| `qa_inputs`, `qa_wall_min`, `qa_model_min`, `qa_per_input_s` | Taps and clicks; QA time; QA time per input |
| `check_step_median_s`, `batched_step_share` | Input to screen seen; share of inputs whose look shared the message |

Compare weeks per input, not in totals: the amount of testing moves a lot from week to week.
