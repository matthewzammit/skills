# Summary

The end-of-run message. Fill the `<...>`, delete what does not apply, and show it to the person. It is posted
somewhere else only when the config names a place (`summary.postTo`) **and** the person has approved this exact
text. Without both, it stays in the chat.

## Headline

Lead with progress, as counts of what the person can act on:

```
Weekly audit, <YYYY-MM-DD>: <N> fixes ready to review, <N> needs your decision, <N> issues found.
```

Leave out a count that is zero. A clean week is one line:

```
Weekly audit, <YYYY-MM-DD>: clean. <N> commits since <date>, no verified findings.
```

Nothing changed since the last run: "Nothing changed since <date>." and stop.

## Draft pull requests

Only when fixing ran. One line each, all drafts waiting for review:

- <Finding title>: <draft pull request link>. <How to check it, in a few words.>

<When fixing was off or stopped by `.weekly-audit-off`, say so in one line. When a fix was skipped, give the
reason in a few words.>

## Decisions needed

Each one: the choice in one line, the options, the pick, and the ticket.

- **<Finding title>** (<severity>, <ticket link>): <the choice>. Options: <1>, <2>, <3>. My pick: <number>,
  <one reason>.

## Carry-over

- Still open from last week: <ticket, link>
- Closed since: <ticket, link>

## The rest

- <N> other findings, each with a ticket: <group name and link>.
- Full record: <path to the record file>.
- Skipped or not checked: <short list, with why>.
