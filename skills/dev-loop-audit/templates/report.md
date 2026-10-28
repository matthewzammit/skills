# Dev loop audit: <from> to <to>

Window: <from> 00:00 to <to> 00:00 (<timezone>). <N> sessions, <N> tool calls, <N> CI runs, <N> commits on <main>.
Scripts: dev-loop-audit <version or commit>; <any config or script change since last run, and what it moves>.

## Summary: minutes lost

| Area | This week | Last week |
|---|---|---|
| CI | <people-min; holes; red; billed runner-min> | |
| Gate | <waste min; real catches> | |
| Agent time | <waits, retries, refusals, long calls> | |
| QA (<add-ons>) | <avoidable min (estimated); total wall + model on N inputs; per input> | |

<Two or three sentences: the biggest change and why.>

## Reliability (ranked by minutes)

1. **<Area>, ~<N> min, <measured | estimated>: <what broke>.** <Evidence: ids.> <Cause.>

## Speed

| Metric | Baseline (first row) | Last week | This week |
|---|---|---|---|
| CI run median / p90 | | | |
| CI queue median | | | |
| Billed minutes | | | |
| Push median / p90 | | | |
| Agent wall / model | | | |
| Sleep-only calls / nominal sleep | | | |
| QA per input | | | |
| Check step median / batched share | | | |

<What got slower and from when; what got faster. The longest job chain and its slowest steps.>

## Already right

- <checked and fine>

## Not checked

- <what, and why>

## Past fixes still holding?

- <fix from <date>: holds | not holding (number) | cannot check>

## Verification of the top findings

- <finding>: holds | downgraded to <N> | dropped (why).

## Proposed fixes, ranked by minutes saved per week

1. **<Reliability | Speed>, <area>: <fix>.** <File or doc to change, what to change.> Saves ~<N> min a week
   (<measured | estimated>). Risk <low | medium | high>. <"Write a plan" if bigger than a day.>

## Built

<Filled in after the person picks: the branch, the pull request, one line per fix and how it was checked.>
