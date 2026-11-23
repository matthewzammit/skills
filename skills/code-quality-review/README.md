# Code quality review

**Review your whole codebase with a team of agents, and get the fixes as small pull requests that are reviewed,
checked in the running app, and ready to merge.** One lead agent plans the run, splits your code into sections, and
sends a read-only survey agent to each. It sorts what they find into small fixes and big items, builds the fixes
you pick with cheaper helper agents, reviews every diff, checks each fix in the app itself, and merges in the right
order when you say yes.

A single review reads a diff. This reads the whole app: the bug two folders apart, the late answer that signs you
back in, the component the compiler quietly skipped, the guide that says one thing while the code does another.

## What it finds

| Lens | For example |
|---|---|
| Improvements | A late reply that overwrites newer data, a list that re-renders on every keystroke, the same logic in three places, dead code, pure logic with no test. |
| Security | Personal data in a log or a crash report, link or push data used without a check. |
| Failure modes | What happens offline, on a timeout, with an empty reply, with extreme data; behaviour nobody wrote down. |
| State machines | The implicit ones: a double tap, a sign-out mid-flow, a screen that can get stuck, each drawn as a diagram and compared with your docs. |
| Speed, tests, structure | A second wave that runs tools a read cannot replace: the compiler's own log, the import graph, what changes together in git. |

## How a run goes

```
agree the rules (four questions)        you answer once
   |
set up: fresh worktree, tracker in the repo, open branches' files, dead-code scan, baseline numbers
   |
plan the sections                       you confirm
   |
survey: one read-only agent per section, in parallel
   |
triage: small fix | big item (plan + ticket) | wait | your decision
   |
recommendations per section             you pick the scope
   |
build (cheaper model) -> review every diff -> check in the running app
   |
pull requests in three lists: nothing to see | checked in the app | needs you
   |
merge in order, after your yes          then clean up and carry open work to the next pass
```

## You stay in control

- It asks four questions before it starts: can a fix change what people see, how fixes ship, where tickets go, how
  big a fix may be. Then which lens, and whether you want findings only or fixes.
- It shows the sections and a cost estimate before any survey starts.
- It builds nothing until you pick, per section or item by item.
- Product decisions come in one batch, each with options and a pick.
- It never merges, releases, posts, signs in to a real account unattended, deletes a screen, or reverses a decision
  your repo recorded, without your yes.
- It does the app checks itself, and tells you up front which checks need you or a real device.

## Install

Follow [Install](../../README.md#install-30-seconds) in the main README, and pick code-quality-review when it asks
which skills you want. Built and proven in Claude Code with subagents; it needs an agent that can start helper agents.

## Run it

| You type | When | What happens |
|---|---|---|
| `/code-quality-review setup` | Once per repo | Learns how your team ships (tickets, branches, plans, checks, which model does what, the device lock, merging) and writes a config and a house rules file. |
| `/code-quality-review` | Any time; best overnight | A full run. Name a lens to skip the question: `improvements`, `state machines` or `both`. |
| `/code-quality-review resume` | After a break or a summarised context | Picks up from the tracker. |

When installed as a Claude Code plugin, the command is `/matthewzammit-skills:code-quality-review`.

## What it costs

A lot of agent time and tokens. On the app it was built from, a first pass ran 13 surveys and found 200 findings with
89 agents in 4 hours overnight, then a day to decide and merge 62 pull requests. A state machine pass ran 10 surveys
and produced 46 fixes. The best model plans, surveys and reviews risky diffs (auth, session, stored data, links,
push); a cheaper one builds and reviews the rest. A load gate keeps the machine from freezing under parallel builds.

## What you get

- A tracker folder in your repo with every finding, decision, branch and pull request, so nothing lives only in a
  chat.
- Small pull requests, one fix each, with the review and the app check in the body.
- Big items as tickets with a short plan.
- A report per section in plain words, with diagrams.
- A run log row, so the next pass can be compared with this one.

## Credits

- Built from two runs on a React Native app at [Binderr](https://binderr.com).
- [caldoai's untangle-codebase skill](https://github.com/caldoai/skills): the structure lens, "one fix behind several
  problems", and special cases as a progress measure.
