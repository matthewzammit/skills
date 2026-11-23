# Triage and pick

The lead reads every findings file and writes `<run>/triage.md`. Builders read it with their own finding.

## 1. Duplicates and shared causes

- Merge findings that are the same bug seen from two sections. Name the owner and list the others under it.
- Group findings with one root cause under **one fix behind several problems**: a shared helper or rule, built once,
  that ends a pattern seen in several areas (a stamp that drops late answers after the session moved; a single-flight
  guard for double taps). Put the fix on top and the problems it solves under it. The person picks a fix, not a
  scattering of symptoms.
- A unit that builds a shared helper goes in the first wave; the units that reuse it wait for it.

## 2. Route every finding

| Route | When | What happens |
|---|---|---|
| Small fix | Size S or M, clear, not hot | One unit: one branch, one PR, one ticket. |
| Big item | Size L, a design change, or a rewrite | A ticket and a short plan. Not built in this run. |
| Wait | A hot file, or an open PR edits the same files | Listed with what it waits for. No stacked PRs. |
| Decision | A product choice, or a fix that reverses a recorded decision | Goes in the decision batch. Never built on a guess. |
| Already decided | A decision record says the code is that way on purpose | Closed, with the record quoted. |
| Covered | An open plan or ticket already covers it | Closed, with the plan named. |
| Confirm first | The survey marked it "suspected" | Reproduced on the main branch before a builder starts; dropped if not. |
| Backend | The fix belongs in another service | A ticket there, linked to an app ticket that is blocked by it. |
| Deferred | Latent, or no caller today | Listed with the reason. |

Each unit gets: an id (`U01`), its findings, severity, size, model (the strong one for risky paths), files, the
approach in a few numbered steps, and the app check that will prove it (or "none: not visible").

## 3. Decisions in one batch

Collect every product decision from every section. Ask them together, each with 2 or 3 options and a pick. Keep
building everything that does not depend on them meanwhile. A decision can create new work: build it in the same
sitting.

## 4. Present per section

One block per section:

```
Sign-in (3 high, 5 medium, 2 low)
  1. Sign out can come undone when the launch check answers late. Fix: drop late answers. M. My pick: build.
  2. A double tap on Continue sends two codes. Fix: one shared guard (also ends 4 problems elsewhere). S.
  3. ...  Needs: a decision (see D2).
  My pick for this section: build 1, 2 and 4; ticket 5 as a big item.
```

Lines say what a person would notice, not file names. Each item has its fix, size, and whether it needs a decision,
a device or a backend answer. Then the scopes, each with its rough time, number of PRs, and what needs the person:

1. Fix everything recommended.
2. Fix one or more sections.
3. Fix the items the person ticks.
4. Findings only: tickets, big-item plans and the report, no code.

The person can change scope at every checkpoint: add a section, drop one, or stop.

## 5. Write the wave plan

In the tracker's unit table: each unit's wave, branch, plan number, model, and what it waits for. A unit forgotten in
the wave plan surfaces only when someone asks "was this built?", so every unit has a row from the start.

Done when: every finding has a route, every unit has a row, and the person has picked.
