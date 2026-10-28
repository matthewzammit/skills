---
name: weekly-audit
description: Weekly code review of what changed since the last run - runs the review skills you have installed (security, accessibility, design, React and React Native, writing) on the changed files in parallel, removes duplicates, checks each finding against the code, writes a dated record, carries open tickets over, puts each choice as options with a pick, and can open draft pull requests for simple fixes when switched on. Recommends a starter set of review skills to install. Use when someone wants a weekly audit or code review, a review of last week's changes, or wants one scheduled.
argument-hint: "[setup | last 7 days | <commit or date>]"
---

# Weekly audit

Review the code that changed since the last run with the review skills the person has installed, and hand back
one verified list. The review rules belong to the skills' authors; this skill is the process around them: a
fixed scope, one record per run, tickets that carry over, choices put as options, and fixes only when switched on.

Talk to the person in short, plain sentences. A finding is real only when you have read the code that proves it.

## 1. Setup (first run, or `setup`)

If the repo has no weekly-audit config (`.weekly-audit/config.json`, or `~/.claude/weekly-audit/<repo>/config.json`),
or `$ARGUMENTS` is `setup`, follow [references/setup.md](references/setup.md). It recommends review skills from
[references/review-skills.md](references/review-skills.md), asks where records go and how tickets are filed, and
offers the weekly schedule. Stop there if the argument was `setup`.

Done when: a config exists, and the person has seen which review skills fit the repo and which are installed.

## 2. Scope

Run `date` and `git fetch` first. The range starts at the end commit of the newest record in `<records>/` and ends
at the tip of the main branch. First run: the last 7 days. `$ARGUMENTS` can name a commit or a date to start from.
If the range has no commits, write nothing and end with one line: "Nothing changed since <date>."

List the commits and the changed files. Leave out generated files, lock files and vendored code.

Done when: you can say the range in one line, with its commit count and its changed files.

## 3. Review

Launch one agent per installed review skill that fits the repo (the config's `skills`), all at once, each with:
the skill's name and the path of its `SKILL.md`, the changed files, the range, and the repo's stack. Each agent
reads the skill and the reference files it points to, applies its rules to the changed files and the code around
them, and returns findings with `file:line`, the rule, the reasoning and a severity. On a platform the skill was
not written for (a web skill on a native app), it applies the principle and translates the mechanism.

At the same time, run the checks in [references/built-in-checklist.md](references/built-in-checklist.md) that
always run. With no review skills installed, run its whole checklist instead, and say in the record that it is thin.
Add the repo's own extra checks from the config's `extraChecks`, if any.

Done when: every agent has returned, and every skill in the config is either run or listed as skipped with why.

## 4. Verify and merge

Merge the findings, and join the ones that are the same problem. For each one, open the code and try to prove it
wrong: a guard elsewhere, a rule the repo already enforces in lint or tests, a misread of the platform. Drop what
does not hold, and say so in the record. A finding that needs a person's choice (a product, design or trade-off
call) gets a **Decision needed** block: the choice in one line, 2 or 3 options, your pick.

Done when: every finding is verified, dropped with a reason, or marked "not verified" with why.

## 5. Record and tickets

Write the record to `<records>/<YYYY-MM-DD>.md` from [templates/record.md](templates/record.md), following
[references/record.md](references/record.md). A clean week still gets a one-line record, so the next scope starts
in the right place.

If the config files tickets:

1. **Carry over first.** Read the last record's ticket group. Move its open tickets into this run's group, close
   the old group, and name what moved in the record.
2. **A new group for this run**, named "Weekly audit, YYYY-MM-DD", created only when there is at least one real
   finding. Never file into an earlier run's group or into one that is closed.
3. **One ticket per verified finding**, with its Decision needed block when it has one. Check the tracker for an
   open ticket on the same problem first.

Done when: the record exists, and tickets are filed if the config asks for them.

## 6. Fix (only when switched on)

Skip this step, and say so in the summary, when the config's `fixes` is not `true`, when a `.weekly-audit-off` file
exists, or when no finding is a clean fix. Otherwise follow [references/fix-rules.md](references/fix-rules.md):
only findings with no Decision needed block, one draft pull request each, never merge.

Done when: each fixable finding has a draft pull request or a written reason it was left.

## 7. Summary

Reply with the summary from [templates/summary.md](templates/summary.md): progress first ("2 fixes ready to
review, 1 needs your decision, 6 issues found"), then the draft pull requests, then the decisions with their
tickets, then what carried over. Post it somewhere else only if the config names a place and the person has
approved the exact text.

Done when: the person has the summary.
