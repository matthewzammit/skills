# Fix rules

Step 6 of the run. It is **off by default**. These rules keep it small and reviewable.

## Why it is off by default

An unattended run that wrote its own fixes shipped regressions that passed every check: lint, type checks, tests,
CI and a manual pass. The agent's confidence was not the problem; the unreviewed volume was. So fixing is a choice
the person makes once, and a person reviews each draft pull request before anything lands. Many findings also
needed a decision rather than a fix, and an unattended run cannot make that decision for the team.

## When fixing runs

All of these hold:

- The config has `"fixes": true`.
- No `.weekly-audit-off` file exists in the repo root or in the records folder. That file is the off-switch: if
  it exists, skip this step and say so in the summary. A person creates it to stop fixes at once.
- The finding is verified, and has **no Decision needed block** and **one clear fix**. A finding where two
  reasonable people would fix it two ways is a decision, not a fix.

When any of these fails, skip the step and say why in the summary.

## One finding, one branch

For each finding that qualifies, up to the cap:

1. Start from the main branch, up to date: `git fetch`, then branch `fix/weekly-audit-<slug>`, where the slug is a
   few words from the finding's title.
2. Make **one small change** for that finding only. Touch no other file for tidiness.
3. Add a **regression test** that fails without the change, when the repo has tests for that kind of code. Add the
   doc change in the **same commit**, when the change alters documented behaviour.
4. Run the repo's own checks (lint, type check, tests, whatever its guide says before a push). All must pass. If a
   check fails and the fix is not obvious, drop the branch and leave the finding as it was, with the reason.
5. Commit with the repo's commit rules, and push the branch.
6. Open a **draft pull request** with `gh pr create --draft`. The description holds the finding (with its ticket
   link), what changed, and a **How to check it** note: the steps a person takes to see the old problem and the
   fix, in plain words.
7. Update the finding's ticket and the record with the pull request link.

Return to the main branch before the next finding, so each branch starts clean.

## Never

- **Never merge** a pull request, and never mark one ready for review. A person does both.
- **Never push to the main branch**, and never force-push.
- **Never touch** native build files, release or signing configuration, database migrations, CI configuration or
  dependency versions. A finding in those areas is a decision for a person, even when the fix looks small.
- Never fix a finding that needs a Decision needed block, or one you could not verify.
- Never batch two findings into one branch or one pull request.
- Never skip or loosen a failing check to get a branch green.

## Cap

At most **5 fixes per run**. Take the highest severity first. The rest stay as findings, and the summary says how
many were left and why.

## What the summary says

For each fix: the finding, the draft pull request link, and that it is a draft waiting for review. For each
finding left alone: the reason in a few words (needs a decision, not clean, over the cap, a check failed, off).
