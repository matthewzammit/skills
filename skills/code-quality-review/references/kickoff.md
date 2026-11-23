# Kickoff: agree the run

This skill reads the whole codebase, starts dozens of agents, writes code and opens tickets and pull requests. The
person must feel in control before anything starts, and stay in control throughout. Give the short version on every
run, the full version on the first.

## Say what it does (one message)

- **What it checks**, in plain words, one example each: correctness (a late answer overwrites newer data), failure
  modes (offline, a timeout, a swallowed error), security (personal data in a log), speed (a list re-rendered on
  every keystroke), tests (pure logic with no test), dead code, docs that say something the code no longer does,
  and implicit state machines (a double tap, a sign-out mid-flow).
- **How it runs**: the best model plans, surveys and checks risky work; a faster one builds. Why: judgement where a
  miss is expensive, cost where the work is mechanical.
- **What it costs**, from a cheap count (files, folders, open branches). Earlier runs for scale: 13 surveys found
  200 findings with 89 agents in 4 hours overnight, plus a day to merge 62 PRs; a state machine pass ran 10 surveys
  of 10 to 15 minutes each and produced 46 fix units. It uses a lot of tokens. Best run with the machine left on and
  undisturbed.
- **What it never does without a yes**: merge to the main branch, release, post to chat or email, sign in to a real
  or staging account unattended, change a decision recorded in the repo, delete a screen or feature, install a skill
  or tool. Add the config's `never` list.
- **What needs the person or a real device**: biometrics, a real push, an email link, a real passcode, hardware.
  Say it now so they can plan to be there.
- **Where everything goes**: the run folder in the repo, tickets under one epic, one report.

## The four questions

Ask these every run, in one message, each with a pick. They decide everything after.

1. **Can a fix change what a person sees?** Pick: yes for small clear bugs; a bigger visible change goes on the list.
2. **How does a fix ship?** Pick: one small PR per fix, cut from the main branch, never stacked. Other options: one
   branch for everything, one PR for everything.
3. **Where does the work go?** Pick: a new epic or parent ticket for this run (the config's `tickets`).
4. **How big may a fix be?** Pick: small and medium are built; a large one becomes a ticket and a short plan.

## The run choices

- **Lens**: improvements, state machines, or both (see [lenses.md](lenses.md)).
- **Output**: findings only (a report, tickets and big-item plans, no code), or fix.
- **Who merges**: "PRs only, I merge", "merge in batches after my yes" (pick), or "merge as they pass". With "PRs
  only", a unit that builds on an earlier fix waits for that merge, so the run pauses at each wave. Every PR
  conflicts on shared version files; merging locally with the repo's merge steps resolves them, a web merge button
  does not.
- **Reasoned assumptions**: when the person is away, make them, keep moving, and list them in the tracker. A unit
  whose choice needs the person's yes (removing something agreed, a new design value) waits; never built on a guess.

## While it runs

- Each message says what finished, what runs, and what waits on the person, with counts.
- Offer to pause, stop or narrow the scope at every checkpoint (after a wave, after a merge).
- Ask product decisions in one batch, with options and a pick, and keep building everything that does not depend on
  them. Never ask what a sensible default answers.
- Name jargon the first time ("unit" = one fix on one branch).
- Say plainly what went wrong, including your own slips.

Done when: the answers are in the tracker's "Agreed" block.
