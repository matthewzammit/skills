# Categories

Each finding goes in one category. The category says which fix to reach for first.

| Category | Use when | Fix first |
|---|---|---|
| **Hidden failure** | A command failed but its result looked fine (a zsh glob error, a step after `;` that hid the one before). | Stop the failure at its cause: a shell option, a wrapper script, a hook that blocks the pattern. |
| **Noisy guardrail** | A hook, check or prompt fired when the work was already right. | Fix the guardrail's test (its pattern, its scope). Removing it is the last choice. |
| **Automated check** | The agent made a mistake that a lint rule, a type, a test or a hook could catch. | Build the check. Read the repo's existing checks first: a broken or unwired one is the finding. |
| **Unproven work** | The scan counted a commit with no check, a check re-run until green, a fix loop, or a sleep or retry added to a test. | The lasting cure for the kind, below. Never a reminder to try harder. |
| **Missing tool** | The agent did a job by hand with a throwaway script, and it went wrong or took many turns. | A script or a flag on an existing script, with a test. |
| **Navigation** | The agent took long to find a file, a fact or a dependency between files. | A pointer in the file the agent already reads, worded with the words the agent searches for. |
| **Information access** | Something the agent needed was not available to it (a log, a service, a page). | Read-only access: tee a log to a file, a read-only token, a fetch script. |
| **Tool economy** | A call was slow or returned far more than needed (heavy results, repeated calls). | A narrower command, a summary flag, batching. |
| **Coding standard** | A reviewer should have caught a judgement call (consistency, style that no tool can test). | A rule in the review checklist. A mechanical rule gets a check instead. |
| **Steering file** | An always-loaded file (AGENTS.md, CLAUDE.md) is long, or holds a rule a check now enforces. | Move the rule to a check or a doc; leave a one-line pointer. Delete rules the agent follows anyway. |
| **Outside the repo** | The cause is in the person's machine or account (a dotfile, global settings). | Give the person the exact line and where it goes. |

## Unproven work

The scan counts four kinds. For each, read the examples, decide whether the work was really unproven, and put the
fix at the cause.

| Count | What it means | Check before you call it a finding | Lasting cure |
|---|---|---|---|
| **Commit with no check** | A `git commit` with no test, build, lint or type check command since the last file edit (edits to .md and .txt files are not counted). | Did a check run in another session, a hook or CI that the scan cannot see? A doc-like or config-only change may need none. | A repo `verify` step, fast and reliable, that the agent runs before each commit. A stamp on each commit saying how it was verified ("none" included), so unverified commits can be counted. A commit gate: off, observe (logs what it would block), enforce (blocks); after 2 blocks in one session the next commit goes through. |
| **Re-run until green** | The same check command ran again with no edit between, failed, then passed. The test is flaky, and a re-run taught the agent to ignore it. | Did the first failure come from the machine (a full disk, a busy port, a service starting)? Then the cause is there. | Fix the flaky test's cause. When it cannot be fixed, delete the test and write down why. Never a retry or a sleep. |
| **Fix loop** | The same check failed 4 or more times in a row, with edits between, and the agent did not ask the person. | Was each round a new failure (progress), or the same one again? Only the same one is a loop. | A rule to stop after 3 failed fix rounds on the same check and ask a person, in the file the agent reads. Make it a hook when the repo can count rounds. |
| **Sleep or retry added to a test** | An Edit or Write to a test file whose new text adds `sleep`, `setTimeout`, a retry helper or `retryTimes`. A Write counts the whole file, so check that the line is new. | Is the wait the thing under test (a debounce, a timeout)? Then it is the test, not a flake fix. | Fix the cause of the flake. A lint rule or a hook that refuses a sleep or retry in a test file stops the next one. |

Give each finding its cost and proof the usual way: the count, and the example command or file from the scan.

## Where a rule lives

- **A check** (lint, type, test, hook, CI) for anything mechanical: a pattern, a banned API, a file location.
  Default to a check over a written rule.
- **The review checklist** for judgement calls. The reviewer reads a diff with little else in context, so it
  can apply rules the builder, busy exploring, forgets.
- **An always-loaded file** only for short pointers to docs. Every line there costs on every turn.
- **A doc**, reached by a pointer, for reference.
- **Memory** only for facts about the person and the work that no file holds. When a tool takes over a remembered
  rule, point the memory note at the tool or delete it.

## Repeats

A repeat (step 4) means the last fix was too narrow. Look one level down: the same hook broken three times by three
different patterns needs a test fed with real data, not a fourth pattern.
