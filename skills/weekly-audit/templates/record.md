# Weekly audit, <YYYY-MM-DD>

Range: `<last end commit>` (last record <date>) to `<end commit, full hash>`. <N> commits, <N> changed files.
Stack: <web | mobile | api | library>. Tickets: <group name and link, or "none filed">.
End commit: `<end commit, full hash>`
Docs re-read: <the docs from the rotation, comma-separated, or none>
Counts: <N> from the review agents, <N> after merging, <N> after verifying, <N> reported.

## Skills run

- <skill>: ran. <one line on what it covered>
- <skill>: skipped, <reason>
- Built-in checks: <security surface, docs freshness, crash reporting, analytics>, <ran | not applicable: reason>
- <If no review skill ran: "Thin review: no review skills installed, so only the built-in checklist ran.">

## Findings

<Important first, then Nit. "None verified this week." when there are none. Pre-existing goes in its own section below.>

### <Short title>

- **Where:** <path/to/file.ext:42>
- **Skill or check:** <skill and rule, or "built-in: security surface">
- **Severity:** <Important | Nit>
- **Verified:** <yes, what you read to prove it | no, why not>
- **What and why:** <Two or three sentences: the problem, the evidence, who it affects.>
- **Ticket:** <link, or "none">

**Decision needed:** <the choice, in one line>
1. <option>, <cost or effect>
2. <option>, <cost or effect>
3. <option, if there is a third>
**My pick:** <number>, because <one reason>.

<Delete the Decision needed block when the finding needs no choice.>

## Pre-existing

- <A problem that was already there before the range, in the same shape as a finding. Not the author's fault, so
  reported apart. Delete the section when empty.>

## Dropped

- <A candidate you disproved, and the code that disproved it. Delete the section when empty.>

## Already tracked

- <A real problem the repo already tracks (ticket, plan, TODO with an owner), and where. Delete when empty.>

## Carry-over

- Last record's findings, re-checked: <title>: fixed in <commit> | still open | dropped, <why>
- With tickets: moved from <last group name> to this run's group: <ticket, link>; closed since: <ticket, why>
- <"First run, nothing to carry over" when there is none.>

## Already right

- <What you checked and found fine, one line each.>

## Not checked

- <What you could not or did not check, and why. In a large range: the files left out.>

## Misses and rules

- <Reverts and fix commits that touched code last week's audit reviewed, and what the audit missed. A proposed rule
  with its evidence, for the person to approve. `extraChecks` that found nothing in a long time, to prune. Delete
  when empty.>

## Summary

<The summary from templates/summary.md, as shown to the person.>

---

<One-line form for a clean week: keep only the title, the Range line and "Clean: no verified findings. Skills
run: <list>." Keep the End commit and Docs re-read lines. The Counts line is optional.>
