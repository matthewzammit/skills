# Build and review

## Starting a builder

Each unit gets one helper agent on the config's build model (the strong model for a unit on a risky path), with a
prompt that names: its worktree, branch, plan number, unit id, the finding ids and findings file, the decisions that
apply, and [../templates/builder-brief.md](../templates/builder-brief.md) filled from the config. The brief opens with
the house rules file.

- One worktree per builder, a sibling of the repo, each branch cut from the main branch. Never stacked.
- The lead hands out plan numbers and branch names at build time, from one place.
- A unit that waits on a decision, a hot file or another unit is not started.
- A unit marked "confirm first" runs as a small check on the main branch before its builder starts, beside builds
  that need no confirm. If the bug does not reproduce, drop or trim the unit.

## The load gate

Heavy jobs (a full test run, a build, an app check batch) on one machine add up fast: five builders each running the
full suite, plus a simulator and a dev server, once took a 12-core machine to a load average of 48 and froze the host
app. Before starting each heavy job:

- the 1-minute load is under 0.75 x the core count, at least 25% of memory is free, and swap is not nearly full
  (swap shows memory pressure when "free" looks fine);
- no more than the config's `loadGate.maxHeavyJobs` heavy jobs run at once (default 2, never more than 4);
- shut down devices nobody needs.

A gate script takes the number of OTHER heavy jobs running, not the maximum. Write the exact command in every brief.
Read-only reviews are light and can run beside heavy jobs. Each builder runs its checks once, at the end, in the
foreground.

If the machine freezes anyway: the work lives in worktrees. Check each one (`git status`, commits ahead, pushed or
not), then resume each agent with a message that says exactly what it left.

## Review every build

Builders' own tests pass almost every time; review is where the real bugs surface. Across two runs, about two in
three builds came back from review with a real fix, including "tests only" units.

- Every built unit gets an independent review against the same brief: does the diff fix the finding, does it break a
  path the finding did not mention, are the tests able to fail, is any doc now false, is anything deleted without a
  decision.
- Model: the config's `models.reviewRisky` for a diff that touches `models.riskyPaths` (auth, session, tokens, stored
  data, the app lock, deep links, push payloads, observability); `models.review` for the rest. When unsure, the
  strong model: a missed auth bug costs more than a review.
- A fix that touches the session, sign-out or tokens: budget an extra review round before the PR. One small held fix
  took three.
- Review findings are fixed with a new commit on the same branch, by the same builder (its context is intact). Never
  amend a pushed commit or force-push.
- A follow-up that adds a new hook, helper or dependency gets a short second review.

Review notes that came up more than once:

- A single-flight guard releases when the promise settles, before a navigation finishes. "Open once, then leave"
  needs a latch that stays shut after success.
- A gate fix lists every writer of each gate input. Dismissing one prompt can open the gate for another.
- "Wait until the work settles" beats "re-read at the deadline": a re-read at a timeout mostly finds the server
  still working.
- A change to a shared component needs an opt-out story: which callers must not get the new behaviour, and which
  callback records a decision.
- A guard test that fails on a redundant list entry breaks the main branch after parallel merges, with no conflict to
  warn. List-hygiene checks warn; only the real rule fails.

## Holding a unit

A unit is held, not shipped, when its review finds a high issue that is not fixed, or when it reverses a decision.
Each held unit gets a decision card in the report: what it does, the risk, 3 options and a pick.

Done when: every unit is built and reviewed, or held with a written reason.
