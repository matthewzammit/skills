# The record

One file per run: `<records>/YYYY-MM-DD.md`, from [../templates/record.md](../templates/record.md). Run `date`
first and use today's real date. The next run reads this file to find where to start, so write it carefully.

## Rules

- **Write the record. Do not commit it** unless the config says to (`"commitRecords": true`). A person reviews
  and commits it.
- **The range and its end commit.** Name the range audited and its end commit by full hash. The next run's scope
  starts at that commit. A record without it breaks the next run.
- **A clean week still writes a record.** Write the one-line form below, so the next scope starts in the right
  place. A week with zero commits writes nothing and ends with "Nothing changed since <date>."
- **Verified, or not.** Each finding says whether you read the code that proves it and tried to prove it wrong.
  "Not verified" says why.
- **Findings come from the code.** Each has `file:line`, the reasoning, and a severity. Skip anything you did not
  read yourself.
- **Say what you did not do.** "Not checked" names the skills skipped (with why), the parts of the repo you did
  not read, and the checks you could not run.
- **Plain words.** Short sentences, written for a person who has not seen the diff.

## Sections

### Header

The date, the range ("last record 2026-10-21, `abc1234`, to `def5678`"), the commit count, the number of changed
files, the stack, and where the tickets for this run live (the group's name and link), if tickets are filed.

### Skills run

A line for each review skill run, and for each skipped one with its reason. Add the built-in checks that ran. When
no review skill ran, say: "Thin review: no review skills installed, so only the built-in checklist ran."

### Findings

Ranked High first. Each finding:

```
### <short title>
- **Where:** path/to/file.ext:42
- **Skill or check:** vibe-security, rule "..." (or "built-in: security surface")
- **Severity:** High | Medium | Low
- **Verified:** yes (what you read to prove it) | no (why not)
- **What and why:** two or three sentences. The problem, the evidence, who it affects.
- **Ticket:** link, if filed
```

Severity:

- **High:** data loss or exposure, a security hole, a crash, a person blocked from finishing a task.
- **Medium:** wrong behaviour in a common path, an accessibility barrier, a missing error state, a doc that
  misleads.
- **Low:** polish, a nit, a doc gap, a convention drift. File a ticket only when it is worth a person's time.

When unsure a finding is real, report it in the record as "not verified" and file no ticket. A noisy list costs
more than a missed nit.

### Decision needed

For a finding that needs a person's choice (a product, design or trade-off call), add a block under it:

```
**Decision needed:** <the choice, in one line>
1. <option>, <the cost or effect>
2. <option>, <the cost or effect>
3. <option, if there is a third>
**My pick:** <number>, because <one reason>.
```

Two or three options only. The same block goes in the ticket. A finding with this block is never fixed
automatically.

### Carry-over

What moved from the last run's ticket group (each ticket, its link, still open), what was closed since (and
why), and what the old group's name and state are now. "First run" or "no earlier group" when there is none.

### Already right

One line each for what was checked and found fine, so nobody re-checks it next week.

### Not checked

What you could not or did not check, and why.

## The one-line record for a clean week

```
# Weekly audit, 2026-10-28

Range: `abc1234` to `def5678` (12 commits, 9 files). Clean: no verified findings. Skills run: vibe-security,
better-ui. End commit: `def5678`.
```

Keep the header's range and end commit. Everything else is optional.
