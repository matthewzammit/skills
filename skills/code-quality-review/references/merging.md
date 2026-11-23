# Pull requests, merging and close out

## Opening the PRs

- Always end in a PR, tested to the point where the person can just merge.
- The builder or the lead opens it, as the config's `pr` says. The lead appends the review result and the app check
  (PASS with screenshots, or "nothing to see") to the body, and moves the ticket as `tickets.move` says.
- Verify each ticket id with a lookup before writing it anywhere: one builder wrote an id with a typo.
- A unit with no path to trigger it in the app (a race only a timer can reach) says so in the PR, and its tests are
  the proof.

## The three lists

Hand the person three lists, one line per PR:

1. **Nothing to see**: docs, tests, invisible code. Merge now.
2. **Checked in the app** and confident.
3. **Needs you**: keep this at zero or one, each with the exact reason an agent cannot do it (a real passcode, a
   real device).

Add a **merge-order list**: hot files and shared helpers first, then the units that reuse them; any pair where one
must go before the other. Many PRs touching the same files make this list essential.

When the person wants to merge a device-only unit without a device check, replace it with a written risk review
(native timing, every odd event order fails safe, "can a device ever be worse than the main branch?") and repeated
recordings on the simulator. Write the residual risk in the PR.

## Merging many PRs

Merge only after a yes, list by list, in the merge-order list, through the config's `merge` steps. Every PR conflicts
on shared version files (version, changelog, plans index), so a batch goes through the repo's merge steps, not a web
merge button.

A small loop per PR: merge without committing, run the repo's reconcile steps, then the plan check, type-check and
the changed tests, and commit only when clean. **Stop** on any of these:

- any unmerged file;
- conflict markers in ANY file type (`grep -l '^<<<<<<<'` over the staged files; a type-checker only catches its own
  files, and a `git add -A` after a failed merge stages markers silently);
- a code file changed on both sides since the branch was cut (hand-check it);
- a dependency change (install, then look);
- a required config value missing after the merge (platform permission strings, keys the repo guards).

Let docs, test config and plan files through, but save their diff for a read afterwards. Most hand stops are import
blocks (keep both). Others seen: a helper moved to a shared module on the main branch (keep the main branch's), an
export deleted on one side and reworded on the other (keep the deletion), code moved out of a file (check the main
branch did not change the moved code since the branch was cut).

After each batch:

- run the full gate, not only per merge: two branches that are each fine can break a test together;
- watch the push gate too: it can catch a flaky test the full run passed a minute earlier;
- planned follow-ups go in the merge that unblocks them (un-skip a property test, drop a coverage exception).

Never edit the checkout the loop merges in while it runs. A merge step that closes or archives plans closes only the
plans the branch finished or added, never one a docs PR only annotated.

## Close out

- **Docs**: grep the docs for each name the merged PRs changed; fix what is now false. Better: each unit PR carries
  its own doc fix and diagram, so the closing docs PR only fills gaps. A docs pass can run as one light helper per
  area with one shared brief: give it the exact merged and not-merged list, quote stale text instead of line
  numbers (they go stale within a day), and have each helper list stale lines outside its list.
- **Big-item plans** written during the run go stale as fixes merge: add a "Since this plan was written" note to each
  one a merge touched (what merged, what is now done, names to reuse).
- **Clean-up offer**: delete this run's merged remote branches (only the run's prefix), remove the helper worktrees,
  shut down the run's device and dev servers. Ask first; never delete anything else.
- **Bugs found in passing**: each already has a ticket; offer to fix them next.
- **The run log**: one row per run (date, wall clock, surveys, findings, fix PRs, held, big items, app checks, agents
  by model, merge time, what cost time), so the next run can be compared.
- **Carry over**: every open unit, held item, big item and owed check goes into the next pass's tracker.

Done when: every unit has a final state, and the run log row is written.
