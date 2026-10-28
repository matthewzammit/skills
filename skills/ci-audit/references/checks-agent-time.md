# Agent time (Claude Code transcripts)

Inputs: `metrics.txt` / `metrics.json` (Agent and QA sections) and `calls.json` for evidence. Every finding names a
session (first 8 characters) and a tool_use id or time.

## How it is measured (so weeks compare)

These rules are in the scripts. Change a rule in the script, never by hand in one report, and say in the report
when a script changed: a new rule moves the numbers a few percent.

- **Source:** `~/.claude/projects/<folder>/*.jsonl` for the repo's folders, main threads only (subagents are
  sidechains). A resumed session replays its history, so calls are de-duplicated by tool_use id.
- **Tool time** = a call's result time minus its start. **Model time** = from a result to the next call in the same
  session; gaps over 10 minutes and gaps with a human message in them are left out (that is the person, not the
  model).
- **Wall time** = the union of tool intervals. Calls sent in one message run in sequence or overlap, so a plain sum
  of tool times double-counts.
- **Person time:** a question to the person, a plan waiting for approval, or any call over 30 minutes (a
  permission prompt left open overnight) is the person's time, not the agent's. It is left out of tool and wall
  time and listed apart (`person_waits`, `person_wait_min`). Report it only when a pattern costs the person, such
  as the same approval asked for again and again.
- **Sleeps:** the nominal seconds of every `sleep N`, apart for calls that are only a sleep. The tool time of a
  command that contains a sleep is not all sleep.
- **Retries:** a Bash command run again within 10 minutes after the same command failed.
- **QA** (the agent checking its work on a device or in a browser; the add-ons say what counts): a QA episode starts
  after 20 minutes with no QA call; setup is its start to its first input, cold when a build, install or start helper
  ran first. A **check step** is an input to the first screen the agent sees after it; it is **batched** when the
  look went in the same message as the input (one round trip instead of two).

## What counts as waste

1. **Waits:** sleep-only calls, sleeps before a check that already waits, and unbounded `until`/`while` loops that
   ran over a minute (`loops_unbounded_over_60s`). A bounded wait on something real (a build) is fine.
2. **Long calls** (`long_calls`, `calls_over_60s_min`): each is a build, a test run, a network call, a stuck
   command, or a wait. Only the last two are waste; a slow build is a speed finding.
3. **Retries** (`retries`, `retry_examples`): the same failing command again. Read why: a flaky tool, an error the
   output hid (a cut-off pipe), or the agent not reading the error.
4. **Refusals:** hook refusals, auto-mode classifier denials and permission denials each cost a turn. A rule the
   agent keeps hitting is a doc gap; a refusal of a correct action is a hook or settings gap.
5. **Repeated command shapes** (`top_bash_shapes`): a long command typed by hand dozens of times wants a script. A
   shape that is only `python3 - <<EOF` or `node -e` means the agent wrote throwaway code again and again: name what
   it computed.
6. **Model time after errors** (`model_after_error_min`): the thinking an error cost.
7. **QA, per input** (`qa.per_input_s` = (QA wall + QA model) / inputs): the one number that compares weeks with
   different amounts of testing. Then: setup warm and cold, the check step median, the batched share, screenshots
   per input, and consecutive screens with no input between (looking twice at the same screen).

## Speed

- Compare every number with last week's trend row and the first row (the baseline). Name what got slower and from
  when (per-session numbers show who), and what got faster.
- Per session (`per_session`): the sessions that cost most per input, and why (setup-heavy, a new device, a
  failing helper, no batching). The fix for a pattern is a helper script or a rule in the agent docs, not a note to
  one session.
- Opportunities: the top 5 with minutes saved per week, cost and risk. When QA lost time, at least one is a QA fix.
