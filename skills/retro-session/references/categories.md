# Categories

Each finding goes in one category. The category says which fix to reach for first.

| Category | Use when | Fix first |
|---|---|---|
| **Hidden failure** | A command failed but its result looked fine (a zsh glob error, a step after `;` that hid the one before). | Stop the failure at its cause: a shell option, a wrapper script, a hook that blocks the pattern. |
| **Noisy guardrail** | A hook, check or prompt fired when the work was already right. | Fix the guardrail's test (its pattern, its scope). Removing it is the last choice. |
| **Automated check** | The agent made a mistake that a lint rule, a type, a test or a hook could catch. | Build the check. Read the repo's existing checks first: a broken or unwired one is the finding. |
| **Missing tool** | The agent did a job by hand with a throwaway script, and it went wrong or took many turns. | A script or a flag on an existing script, with a test. |
| **Navigation** | The agent took long to find a file, a fact or a dependency between files. | A pointer in the file the agent already reads, worded with the words the agent searches for. |
| **Information access** | Something the agent needed was not available to it (a log, a service, a page). | Read-only access: tee a log to a file, a read-only token, a fetch script. |
| **Tool economy** | A call was slow or returned far more than needed (heavy results, repeated calls). | A narrower command, a summary flag, batching. |
| **Coding standard** | A reviewer should have caught a judgement call (consistency, style that no tool can test). | A rule in the review checklist. A mechanical rule gets a check instead. |
| **Steering file** | An always-loaded file (AGENTS.md, CLAUDE.md) is long, or holds a rule a check now enforces. | Move the rule to a check or a doc; leave a one-line pointer. Delete rules the agent follows anyway. |
| **Outside the repo** | The cause is in the person's machine or account (a dotfile, global settings). | Give the person the exact line and where it goes. |

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
