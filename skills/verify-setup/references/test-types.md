# Which checks to add

For a repo with few checks. Add them in this order. Each one makes the next commit safer and each one is worth
having alone.

The order comes from the Claude Code team's public post, "How the Claude Code team thinks about verification". Read
it for the reasons.

## 1. End-to-end first

Run the real app and check what a person would see: a browser for a web app, a simulator for a mobile app, a local
service for a backend, the binary for a command line tool.

Start with a **feature map**: a short list of the user flows, each with its expected result.

```text
Sign in with a valid code -> the home screen shows the account name
Sign in with a wrong code -> an error says the code is wrong, and the field keeps focus
Add an item -> it appears at the top of the list and the count goes up by one
```

The map is the rubric. An agent walks the flows a change touches and says, per flow, what it saw. Keep the map
in the repo, one line per flow, and add a line each time a bug reaches a person.

Add an automated end-to-end test for the flows that break most. Keep the set small and fast: a slow set is not
run.

## 2. Property tests

Test a rule that holds for any input, not one example. Good rules:

- **Round trip:** encode then decode gives the input back.
- **Invariant:** the total never goes below zero; a list stays sorted.
- **Idempotent:** doing it twice gives the same result as doing it once.
- **Equivalence:** a fast version gives the same answer as a simple one.

Libraries: fast-check (JavaScript), Hypothesis (Python), proptest (Rust). Use one; do not write a generator by
hand. Keep the seed in the failure output so a failure can be replayed.

## 3. Differential tests

For a migration or a rewrite, the old system is the oracle. Run the same inputs through the old and the new one and
compare.

- Normalise noise first: timestamps, ids, key order, float rounding.
- Keep an **approved-changes list** of differences a person accepted, each with a reason. A difference not on the
  list fails the check.
- Retire the check when the old system is gone.

## Flaky tests

A flaky test teaches an agent to run it again instead of reading it. Fix the cause, or delete the test and write
down why. Never add a sleep or a retry to turn a test green.

## Keep the set small

Remove a check that has not failed for real in a long time, or that fails for reasons nobody fixes. Look at the set
on a schedule, so it does not turn into sediment.
