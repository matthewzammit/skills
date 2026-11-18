# Misses become rules, and unused rules are pruned

Part of step 5, after the carry-over. It proposes changes to the config's `extraChecks`. It never makes one: the
person approves each.

## Look for misses

1. In the new range, list the reverts (`git log --grep='^Revert'`) and the commits that say they fix something.
2. Keep those that touched code last week's audit reviewed (the files in last record's range).
3. For each, read the original change and the fix. Ask: could a reviewer have seen this bug from the original diff
   alone? If it needed logs, a device or the live system, it is not a miss for the audit.
4. Note each miss in the record's "Misses and rules" section: the commits, the bug, and whether the diff showed it.

## Propose a rule

A rule can be proposed only when all of these hold:

- **At least 2 changes show the pattern.** One miss is an event. Look through earlier records and `git log` for a
  second change with the same cause.
- **A diff is enough to check it.** The rule is a sentence a reviewer can test by reading a diff ("a new route
  handler without an access check", "a new event name not in the tracking list"). Rules that need running the app
  are not rules for this audit.
- **It survived an attempt to disprove it.** Look for changes that match the rule and were fine. If most matches
  are fine, narrow the rule or drop it.

Write the proposal as a Decision needed block: the rule in one line, the 2 or more changes, what you did to
disprove it, options (add it, narrow it, skip it), your pick. After the person approves, the rule goes in the
repo's reviewer rule file through a normal change. It applies from the run after that change is merged, because
rules are read from the default branch.

## Prune

A check that never finds anything turns into sediment. When the records hold at least 12 runs, list each
`extraChecks` entry that no record names under "Skill or check" in all of them. Propose removing or narrowing
each, with the date it last found something. The person decides. With fewer records, skip this.

Done when: every revert and fix commit in the range is read and noted or dismissed, each proposed rule meets all
three conditions, and the prune list is written or skipped with the reason.
